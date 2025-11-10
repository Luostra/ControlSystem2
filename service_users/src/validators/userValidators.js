const { z } = require('zod');

const registerValidator = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    roles: z.array(z.string()).optional().default(['user'])
  })
});

const loginValidator = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  })
});

const updateProfileValidator = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional()
  })
});

module.exports = {
  registerValidator,
  loginValidator,
  updateProfileValidator
};