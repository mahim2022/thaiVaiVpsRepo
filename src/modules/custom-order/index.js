const { Module } = require("@medusajs/framework/utils")
const CustomOrderModuleService = require("./service")

const CUSTOM_ORDER_MODULE = "customOrder"

const customOrderModule = Module(CUSTOM_ORDER_MODULE, {
  service: CustomOrderModuleService,
})

module.exports = {
  default: customOrderModule,
  CUSTOM_ORDER_MODULE,
}
