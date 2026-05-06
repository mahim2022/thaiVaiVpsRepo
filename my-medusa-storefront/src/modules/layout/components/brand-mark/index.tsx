import { clx } from "@medusajs/ui"
import Image from "next/image"

type BrandMarkProps = {
  className?: string
  imageClassName?: string
  priority?: boolean
  width?: number
  height?: number
}

export default function BrandMark({
  className,
  imageClassName,
  priority,
  width = 48,
  height = 48,
}: BrandMarkProps) {
  return (
    <span className={clx("inline-flex items-center justify-center", className)}>
      <Image
        src="/images/logo.png"
        alt="ThaiVai Store logo"
        width={width}
        height={height}
        className={clx("h-12 w-12 object-contain block", imageClassName)}
        priority={priority}
      />
    </span>
  )
}