import { MedusaService } from "@medusajs/framework/utils"
import CustomOrder from "./models/custom-order"

class CustomOrderModuleService extends MedusaService({
  CustomOrder,
}) {
  async updateAttachments(id: string, attachments: any[]) {
    try {
      const connection = this.manager_.connection
      const jsonbValue = JSON.stringify(attachments)
      
      // Execute raw SQL to persist JSONB attachments
      const result = await connection.query(
        'UPDATE custom_order SET attachments = $1::jsonb WHERE id = $2',
        [jsonbValue, id]
      )
      
      // Verify the update
      if (!result) {
        console.warn("Update returned no result for custom_order:", id)
      }
      
      // Return the updated record by fetching it
      return await this.retrieveCustomOrder(id)
    } catch (error) {
      console.error("Error updating attachments for order:", id, error)
      throw error
    }
  }
}

export default CustomOrderModuleService
