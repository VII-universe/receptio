'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { AudioLevels } from './demo-player'
import { OrbStatic } from './orb-static'

// Hlasový orb Aidy: jeden fragment shader na čtverci přes celé plátno (bez three.js, pár kB).
// Tvar deformuje šum; hlasitost, basy a výšky z analyzátoru ho nafukují a rozvlňují,
// barva se přelévá mezi teplou Aidou a chladným volajícím.

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

const FRAG = `precision mediump float;
uniform vec2 uRes;
uniform float uTime,uAmp,uLow,uHigh,uSpeaker,uMotion;
uniform vec3 uTint,uAida,uCaller;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
void main(){
  float px=1./min(uRes.x,uRes.y);
  vec2 p=(gl_FragCoord.xy-.5*uRes)*px;
  float r=length(p),t=uTime;
  // směr bez atan: šum je spojitý kolem celého obvodu (žádný šev)
  vec2 dir=p/max(r,1e-4);
  float n1=fbm(dir*1.3+vec2(t*.21,-t*.16));
  float n2=n(dir*1.8+vec2(-t*.8,t*.6));
  float R0=.29+.012*sin(t*1.05)*uMotion+uAmp*.05+uLow*.02;
  float R=R0+((n1-.5)*(.035+uAmp*.1)+(n2-.5)*uHigh*.05)*uMotion;
  float d=r-R;
  float body=smoothstep(px*1.5,-px*1.5,d);
  vec3 voice=mix(uCaller,uAida,uSpeaker);
  // volající (chladná modrá) převládne, u Aidy zůstává nádech oboru
  vec3 col=mix(uTint,voice,clamp(uAmp*3.,0.,1.)*mix(.9,.45,uSpeaker));
  // vnitřek: měkký tok, světlo nahoře vlevo, stín dole vpravo, jas u okraje (pevný poloměr = bez paprsků)
  float q=r/R0;
  float flow=fbm(p*3.2+vec2(t*.22,t*.15)+fbm(p*2.-t*.1));
  vec3 c=col*(.78+.38*flow);
  c=mix(c,col*.6,smoothstep(.1,1.1,length(p-vec2(.11,-.13))/R0)*.45);
  c+=vec3(1.,.97,.92)*smoothstep(.95,0.,length(p-vec2(-.08,.1))/R0)*(.5-uAmp*.2);
  c+=mix(col,vec3(1.),.3)*smoothstep(.6,1.,q)*(.1+uAmp*.28);
  // záře a vlny hlasu (měkké, rozbíhají se od okraje)
  float glow=exp(-max(d,0.)*(11.-uAmp*5.))*(.28+uAmp*.62);
  float ring=0.;
  for(int i=0;i<2;i++){float ph=fract(t*.5+float(i)*.5);ring+=exp(-pow((d-ph*.17)/.011,2.))*(1.-ph)*(1.-ph);}
  ring*=uAmp*1.1*uMotion;
  // záře u okraje plátna dohasne do nuly, aby na tmavém pozadí nebyla vidět hranice plátna
  float edge=smoothstep(.5,.4,max(abs(p.x),abs(p.y)));
  float outA=clamp(glow*.9+ring*.7,0.,1.)*edge;
  vec3 outC=mix(col,vec3(1.),.25+ring*.3);
  float alpha=body+(1.-body)*outA;
  vec3 rgb=c*body+outC*outA*(1.-body);
  gl_FragColor=vec4(rgb,alpha);
}`

const hex = (h: string): [number, number, number] => {
  const v = parseInt(h.replace('#', ''), 16)
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}
const AIDA = hex('#ff8a4c')
const CALLER = hex('#7fb2ff')

export default function AidaOrb({
  tint,
  levels,
  active,
  className,
}: {
  tint: string
  levels: React.RefObject<AudioLevels>
  /** Hraje ukázka (plná snímková frekvence). */
  active: boolean
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const tintRef = useRef(hex(tint))
  const activeRef = useRef(active)
  const wake = useRef<() => void>(() => {})

  useEffect(() => {
    tintRef.current = hex(tint)
    wake.current()
  }, [tint])
  useEffect(() => {
    activeRef.current = active
    wake.current()
  }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' })
    if (!gl) {
      setFailed(true)
      return
    }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true)
      return
    }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = (name: string) => gl.getUniformLocation(prog, name)
    const U = {
      res: u('uRes'), time: u('uTime'), amp: u('uAmp'), low: u('uLow'), high: u('uHigh'),
      speaker: u('uSpeaker'), motion: u('uMotion'), tint: u('uTint'), aida: u('uAida'), caller: u('uCaller'),
    }
    gl.uniform3fv(U.aida, AIDA)
    gl.uniform3fv(U.caller, CALLER)
    gl.clearColor(0, 0, 0, 0)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const tintNow = [...tintRef.current]
    const smooth = { amp: 0, low: 0, high: 0, speaker: 1 }
    let raf = 0
    let last = 0
    let visible = true
    let elapsed = 0
    let prev = performance.now()

    // Rozměr plátna: CSS velikost se čte jen při změně (ResizeObserver), ne každý snímek.
    // `scale` snižuje rozlišení, když GPU nestíhá (orb je měkký, nižší rozlišení skoro není vidět).
    const size = { w: canvas.clientWidth, h: canvas.clientHeight }
    let scale = 1
    let slow = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75) * scale
      const w = Math.max(1, Math.round(size.w * dpr))
      const h = Math.max(1, Math.round(size.h * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }
    // Při přehrávání hlídá rytmus snímků: řada pomalých (> 20 ms) sníží rozlišení o krok, nejvýš na polovinu.
    const adapt = (frameMs: number) => {
      slow = frameMs > 20 ? slow + 1 : Math.max(0, slow - 1)
      if (slow >= 12 && scale > 0.5) {
        scale = Math.max(0.5, scale - 0.15)
        slow = 0
      }
    }

    const draw = (now: number) => {
      raf = 0
      const lv = levels.current
      const playing = activeRef.current && lv.playing
      // v klidu jen pomalé dýchání ~20 snímků/s; při hlasu plná frekvence
      const minDelta = playing ? 0 : 50
      if (now - last < minDelta) {
        schedule()
        return
      }
      last = now
      if (playing && !document.hidden) adapt(now - prev)
      const dt = Math.min(0.1, (now - prev) / 1000)
      prev = now
      const motion = reduced.matches ? 0 : 1
      if (motion) elapsed += dt
      const towards = (from: number, to: number, speed: number) => from + (to - from) * (1 - Math.exp(-speed * dt))
      smooth.amp = towards(smooth.amp, activeRef.current ? lv.amp : 0, playing ? 30 : 4)
      smooth.low = towards(smooth.low, activeRef.current ? lv.low : 0, 12)
      smooth.high = towards(smooth.high, activeRef.current ? lv.high : 0, 12)
      smooth.speaker = towards(smooth.speaker, lv.speaker, 6)
      for (let i = 0; i < 3; i++) tintNow[i] = towards(tintNow[i], tintRef.current[i], 5)

      resize()
      gl.uniform2f(U.res, canvas.width, canvas.height)
      gl.uniform1f(U.time, elapsed)
      // při omezeném pohybu bez deformací: orb jen jemně pulzuje podle hlasitosti
      gl.uniform1f(U.amp, smooth.amp)
      gl.uniform1f(U.low, smooth.low)
      gl.uniform1f(U.high, smooth.high)
      gl.uniform1f(U.speaker, smooth.speaker)
      gl.uniform1f(U.motion, motion)
      gl.uniform3fv(U.tint, tintNow)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      const settling = smooth.amp > 0.002 || Math.abs(tintNow[0] - tintRef.current[0]) > 0.002
      if (playing || motion || settling) schedule()
    }

    const schedule = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw)
    }
    const onWake = () => {
      prev = performance.now()
      schedule()
    }
    wake.current = onWake

    const halt = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    // Mimo viewport a ve skryté záložce se nevykresluje vůbec.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) onWake()
      else halt()
    })
    io.observe(canvas)
    const onVis = () => (document.hidden ? halt() : onWake())
    document.addEventListener('visibilitychange', onVis)
    const ro = new ResizeObserver(([e]) => {
      size.w = e.contentRect.width
      size.h = e.contentRect.height
      onWake()
    })
    ro.observe(canvas)
    const onLost = (e: Event) => {
      e.preventDefault()
      setFailed(true)
    }
    canvas.addEventListener('webglcontextlost', onLost)
    reduced.addEventListener('change', onWake)
    onWake()

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('webglcontextlost', onLost)
      reduced.removeEventListener('change', onWake)
      wake.current = () => {}
    }
  }, [levels])

  if (failed) return <OrbStatic tint={tint} className={className} />
  return <canvas ref={canvasRef} aria-hidden className={cn('aspect-square w-full', className)} />
}
