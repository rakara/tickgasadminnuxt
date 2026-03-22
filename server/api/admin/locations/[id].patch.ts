/** PATCH /api/admin/locations/:id — toggle active, update name/area/coords */

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Location ID required' })

  const body = await readBody(event)
  const updates: Record<string, unknown> = {}

  if (body.active    !== undefined) updates.active    = body.active
  if (body.name      !== undefined) updates.name      = body.name
  if (body.area      !== undefined) updates.area      = body.area
  if (body.latitude  !== undefined) updates.latitude  = body.latitude  ? Number(body.latitude)  : null
  if (body.longitude !== undefined) updates.longitude = body.longitude ? Number(body.longitude) : null

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  const db = useSupabaseAdmin()

  const { data: location, error } = await db
    .from('service_locations')
    .update(updates)
    .eq('id', id)
    .select('id, name, area, latitude, longitude, active')
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw createError({ statusCode: 404, message: 'Location not found' })
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true, location }
})
