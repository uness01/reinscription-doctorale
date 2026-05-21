"use client"

import { useRef } from "react"
import SignatureCanvas from "react-signature-canvas"

type Props = {
  onChange: (dataUrl: string | null) => void
}

export default function SignaturePad({ onChange }: Props) {
  const padRef = useRef<SignatureCanvas>(null)

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
      <div className="overflow-hidden rounded border border-border bg-white">
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
