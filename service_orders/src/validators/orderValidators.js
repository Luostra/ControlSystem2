const { z } = require('zod');

const itemValidator = z.object({
  product: z.string().min(1, 'Product name is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive')
});

const createOrderValidator = z.object({
  body: z.object({
    items: z.array(itemValidator).min(1, 'At least one item is required'),
    notes: z.string().optional()
  })
});

const updateOrderValidator = z.object({
  body: z.object({
    status: z.string().min(1, 'Status is required')
  })
});

module.exports = {
  createOrderValidator,
  updateOrderValidator
};