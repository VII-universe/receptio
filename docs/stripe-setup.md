# Stripe – nastavení overage (minuty nad limit plánu)

Ceny se v kódu nevytvářejí (vyžadovalo by to restricted key s právem zápisu). Vytvoř je ručně ve Stripe dashboardu
a zkopíruj ID do proměnných prostředí.

> **Poznámka k API.** Stripe API verze 2025-03-31 a novější zrušilo „usage records"
> (`subscriptionItems.createUsageRecord`). Metered ceny se teď váží na **Billing Meter** a využití se hlásí jako
> **meter events**. Kód proto posílá `stripe.billing.meterEvents.create(...)`, ne usage records.

## 1. Meter (měřič)

Dashboard → **Billing → Meters → Create meter**:

| Pole | Hodnota |
| --- | --- |
| Display name | Receptio overage minutes |
| Event name | `receptio_overage_minutes` (nebo jiný; pak nastav `STRIPE_OVERAGE_METER_EVENT_NAME`) |
| Aggregation | Sum |
| Customer mapping | výchozí (`stripe_customer_id`) |
| Value key | výchozí (`value`) |

## 2. Produkt a ceny

Dashboard → **Product catalog → Add product**:

- Name: **Receptio Overage Minutes**
- Pricing model: **Usage-based**, napojit na meter z kroku 1, agregace **Sum**
- Unit label: `minute`
- Cena v **EUR**: `0,15` za jednotku (`per_unit`)
- Přidat druhou cenu v **CZK**: `4` za jednotku

## 3. Proměnné prostředí (Vercel → Settings → Environment Variables)

```
STRIPE_OVERAGE_PRICE_ID_EUR=price_xxx
STRIPE_OVERAGE_PRICE_ID_CZK=price_xxx
STRIPE_OVERAGE_METER_EVENT_NAME=receptio_overage_minutes   # jen pokud jsi event name změnil
```

Bez cen se předplatné vytvoří bez metered položky a při dosažení limitu se hovory pozastaví (místo účtování).

## 4. Jak to funguje

- Checkout přidá k měsíčnímu poplatku i metered položku (bez množství).
- Webhook uloží ID této položky do `workspaces.overage_subscription_item_id`; jen předplatné, které ji má, smí limit překročit.
- Po každém hovoru se minuty nad limit plánu nahlásí do Stripe (jen přírůstek; `workspaces.overage_minutes_reported`).
  Událost má deterministické `identifier`, opakované odeslání se tedy neúčtuje dvakrát.
- Nové fakturační období (webhook ze Stripe i denní cron) počitadlo nuluje.
- Bez overage položky (trial, plán Zdarma, starší předplatné) se při dosažení limitu hovory pozastaví.

## 5. Zákaznický portál

Pokud zákazníci mění plán v Stripe Customer Portal, přidej do portálu (Settings → Billing → Customer portal →
Subscriptions → Products) i produkt **Receptio Overage Minutes**, jinak by přechod na jiný plán metered položku odstranil.
