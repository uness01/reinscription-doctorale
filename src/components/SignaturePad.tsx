"use client"

import { useRef, useEffect } from "react"
import SignatureCanvas from "react-signature-canvas"

type Props = {
  onChange: (dataUrl: string | null) => void
}

export default function SignaturePad({ onChange }: Props) {
  const padRef = useRef<SignatureCanvas>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    function resize() {
      if (!containerRef.current || !padRef.current) return
      const canvas = padRef.current.getCanvas()
      const w = containerRef.current.offsetWidth
      if (w > 0 && canvas.width !== w) {
        canvas.width = w
        padRef.current.clear()
        onChangeRef.current(null)
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  function handleClear() {
    padRef.current?.clear()
    onChange(null)
  }

  function handleEnd() {
    if (padRef.current && !padRef.current.isEmpty()) {
      onChange(padRef.current.toDataURL("image/png"))
    }
  }

  return (
    <div>
      <div ref={containerRef} className="overflow-hidden rounded border border-border bg-white">
        <SignatureCanvas
          ref={padRef}
          onEnd={handleEnd}
          canvasProps={{
            width: 560,
            height: 160,
            className: "touch-none block",
          }}
          penColor="#1a1a1a"
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="mt-1.5 text-xs text-muted transition-colors hover:text-accent"
      >
        Effacer
      </button>
    </div>
  )
}
