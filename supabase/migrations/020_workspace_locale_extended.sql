alter table workspaces drop constraint if exists workspaces_locale_check;
alter table workspaces
  add constraint workspaces_locale_check
  check (locale in (
    'cs','en','de','pl','sk','fr','nl','bg','tr',
    'it','pt','es','sv','da','fi','no','ro','hu','hr','et','lv','lt','el'
  ));
