/**
 * PUT /api/admin/orders
 * Update an order's status + append a tracking entry.
 */

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { orderId, status, notes } = await readBody(event)

  if (!orderId || !status) {
    throw createError({ statusCode: 400, message: 'orderId and status are required' })
  }

  const validStatuses = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled']
  if (!validStatuses.includes(status)) {
    throw createError({ statusCode: 400, message: `status must be one of: ${validStatuses.join(', ')}` })
  }

  const db = useSupabaseAdmin()

  const timestampFields: Record<string, Date> = {}
  if (status === 'confirmed') timestampFields.confirmed_at = new Date()
  if (status === 'delivered') timestampFields.delivered_at = new Date()
  if (status === 'cancelled') timestampFields.cancelled_at = new Date()

  const { data: order, error } = await db
    .from('orders')
    .update({ status, ...timestampFields })
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw createError({ statusCode: 404, message: 'Order not found' })
    throw createError({ statusCode: 500, message: error.message })
  }

  // Non-blocking tracking entry
  await db.from('order_tracking').insert([{
    order_id: orderId,
    status,
    notes: notes || `Order status updated to ${status} by admin`,
  }]).catch((e: Error) => console.warn('[orders] tracking insert failed:', e.message))

  return { success: true, order }
})
