const { model } = require("@medusajs/framework/utils")

const CustomOrder = model.define("custom_order", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  title: model.text(),
  description: model.text(),
  status: model.text().default("submitted"),
  admin_reply: model.text().nullable(),
  attachments: model.json().nullable(),
})

module.exports = CustomOrder
