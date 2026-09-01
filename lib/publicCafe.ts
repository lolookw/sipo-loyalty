// Campos del café que SÍ pueden salir a una pantalla pública (la home del café, la tarjeta de
// fidelidad, la API pública por slug).
//
// Ojo: pasarle el registro entero de Prisma a un componente cliente lo publica en el HTML — Next
// serializa las props en el payload de la página. El registro de Cafe tiene, además de lo visual,
// el email de la cuenta de Mercado Pago del dueño, el id de la suscripción, el monto que se le
// cobra, el estado del plan y las plantillas de email del café. Nada de eso tiene por qué verlo
// un cliente que entra a tomar un café, así que se enumera lo que se muestra en vez de excluir
// caso por caso: un campo sensible nuevo en el schema queda afuera solo.
export const PUBLIC_CAFE_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  logoUrl: true,
  coverUrl: true,
  primaryColor: true,
  accentColor: true,
  fontFamily: true,

  menuUrl: true,
  mapsUrl: true,
  instagramUrl: true,
  whatsappUrl: true,
  websiteUrl: true,
  customLinks: true,
  reviewUrl: true,

  loyaltyEnabled: true,
  stampEnabled: true,
  stampsRequired: true,
  stampReward: true,
  pointsEnabled: true,
  pointsPerPeso: true,
  currencySymbol: true,
  minPurchaseForStamp: true,
  stampExpiryDays: true,

  referralEnabled: true,
  referralRewardType: true,
  referralRewardAmount: true,

  rewards: { where: { active: true }, orderBy: { pointsCost: 'asc' } },
} as const
