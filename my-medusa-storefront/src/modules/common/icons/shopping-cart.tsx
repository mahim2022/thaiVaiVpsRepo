import React from "react"

import { IconProps } from "types/icon"

const ShoppingCart: React.FC<IconProps> = ({
  size = "20",
  color = "currentColor",
  ...attributes
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <path
        d="M2.5 3.5H4.5L6.2 12.1C6.31 12.63 6.78 13 7.32 13H14.8C15.31 13 15.76 12.68 15.91 12.19L17.5 7H5.35"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 16.25C8.19036 16.25 8.75 15.6904 8.75 15C8.75 14.3096 8.19036 13.75 7.5 13.75C6.80964 13.75 6.25 14.3096 6.25 15C6.25 15.6904 6.80964 16.25 7.5 16.25Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 16.25C15.1904 16.25 15.75 15.6904 15.75 15C15.75 14.3096 15.1904 13.75 14.5 13.75C13.8096 13.75 13.25 14.3096 13.25 15C13.25 15.6904 13.8096 16.25 14.5 16.25Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default ShoppingCart