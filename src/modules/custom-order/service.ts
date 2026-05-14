import { MedusaService } from "@medusajs/framework/utils"
import CustomOrder from "./models/custom-order"

class CustomOrderModuleService extends MedusaService({
  CustomOrder,
}) {
  async updateAttachments(id: string, attachments: any[]) {
    try {
      await this.updateCustomOrders({
        id,
        attachments: attachments as unknown as Record<string, unknown>,
      })

      return await this.retrieveCustomOrder(id)
    } catch (error) {
      console.error("Error updating attachments for order:", id, error)
      throw error
    }
  }
}

export default CustomOrderModuleService
