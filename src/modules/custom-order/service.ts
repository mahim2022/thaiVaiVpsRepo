import { MedusaService } from "@medusajs/framework/utils"
import CustomOrder from "./models/custom-order"

class CustomOrderModuleService extends MedusaService({
  CustomOrder,
}) {}

export default CustomOrderModuleService
