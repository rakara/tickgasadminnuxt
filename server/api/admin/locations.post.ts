/** POST /api/admin/locations — create a service location */

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { name, area, latitude, longitude } = await readBody(event)

  if (!name) throw createError({ statusCode: 400, message: 'name is required' })

  const db = useSupabaseAdmin()

  const { data: location, error } = await db
    .from('service_locations')
    .insert([{
      name,
      area:      area      || null,
      latitude:  latitude  ? Number(latitude)  : null,
      longitude: longitude ? Number(longitude) : null,
      active:    true,
    }])
    .select('id, name, area, latitude, longitude, active, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  setResponseStatus(event, 201)
  return { success: true, location }
})
