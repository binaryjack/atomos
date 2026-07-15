import { LightweightCanvas } from "../../../components/LightweightCanvasWrapper";

export default function mvvmPage() {
  return (
    <div className="flex-1 w-full h-full relative overflow-hidden">
      <LightweightCanvas preset="mvvm" />
    </div>
  )
}
