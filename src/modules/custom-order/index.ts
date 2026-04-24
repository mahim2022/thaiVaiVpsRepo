import { Module } from "@medusajs/framework/utils"
import CustomOrderModuleService from "./service"

export const CUSTOM_ORDER_MODULE = "customOrder"

export default Module(CUSTOM_ORDER_MODULE, {
  service: CustomOrderModuleService,
})
