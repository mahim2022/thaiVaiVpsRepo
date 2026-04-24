const { MedusaService } = require("@medusajs/framework/utils")
const CustomOrder = require("./models/custom-order")

class CustomOrderModuleService extends MedusaService({
  CustomOrder,
}) {}

module.exports = CustomOrderModuleService
