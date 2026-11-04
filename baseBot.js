const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// 1. Comando /start (Bienvenida y Menú Principal)
bot.start((ctx) => {
  const userName = ctx.from.first_name || 'Inversionista';
  
  ctx.reply(
    `¡Hola, *${userName}*! 🚀\n\nQué bueno tenerte por aquí. Estás a un paso de poner a trabajar tu dinero de forma inteligente, incluso si es tu primera vez invirtiendo.\n\n¿Qué te gustaría hacer hoy? Elige una opción abajo para comenzar:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Ver Paquetes de Inversión', 'menu_packages')],
        [Markup.button.callback('🎥 Ver Testimonios (Nequi / Bre-B)', 'menu_testimonials')],
        [Markup.button.callback('🛡️ ¿Cómo funciona la Garantía?', 'menu_guarantee')],
        [Markup.button.callback('💬 Hablar con Soporte', 'menu_support')]
      ])
    }
  );
});

// 2. Sección: Paquetes de Inversión
bot.action('menu_packages', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `📊 *Nuestros Planes Activos*\n\n` +
    `*🟢 Paquete Nuevo Inversor*\n` +
    `• *Inversión:* $50.000 COP\n` +
    `• *Plazo:* 21 días\n` +
    `• *Activos a elegir:* Bitcoin ₿, S&P 500 📈, Oro 🥇 o Petróleo 🛢️.\n` +
    `• *Beneficio:* Ideal para dar el primer paso y ver resultados a corto plazo.\n\n` +
    `¿Deseas activar este paquete o ver opciones avanzadas?`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('👉 Seleccionar Paquete $50.000 COP', 'select_50k')],
        [Markup.button.callback('🔵 Ver Paquetes Avanzados', 'menu_advanced_packages')],
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
      ])
    }
  );
});

// 3. Selección del Paquete de $50.000 COP (Elección de Activo)
bot.action('select_50k', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `✨ *¡Excelente elección! El Paquete Nuevo Inversor de $50.000 COP es tu puerta de entrada.*\n\n` +
    `Por favor, selecciona en qué activo deseas poner a trabajar tu capital durante los próximos 21 días:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('₿ Bitcoin', 'asset_btc'), Markup.button.callback('📈 S&P 500', 'asset_sp500')],
        [Markup.button.callback('🥇 Oro', 'asset_gold'), Markup.button.callback('🛢️ Petróleo', 'asset_oil')],
        [Markup.button.callback('⬅️ Volver a Paquetes', 'menu_packages')]
      ])
    }
  );
});

// Capturar activo seleccionado (Ejemplo para Bitcoin)
bot.action('asset_btc', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `✅ Has elegido *Bitcoin (₿)* para tu ciclo de 21 días.\n\n` +
    `Para proceder con el pago de tus **$50.000 COP** vía Nequi o Bre-B y recibir tu moneda de garantía virtual en HTML, escribe o contacta a nuestro asesor asignado aquí: \n👉 \`@TuAliasDeSoporte\``,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
      ])
    }
  );
});


// 4. Sección: Testimonios
bot.action('menu_testimonials', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🎥 *Prueba Social Real*\n\n` +
    `Aquí puedes ver cómo nuestra comunidad recibe sus ganancias de forma directa a sus cuentas en *Nequi* y *Bre-B*.\n\n` +
    `*(Aquí enviaremos los videos o capturas de pantalla de las consignaciones exitosas)*`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Quiero Invertir Ahora ($50k)', 'menu_packages')],
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
      ])
    }
  );
});


// 5. Sección: Garantía (Moneda HTML/JS)
bot.action('menu_guarantee', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🛡️ *Tu Garantía de Inversión*\n\n` +
    `Queremos que te sientas 100% seguro. Al activar cualquier paquete, recibes de forma inmediata un **Certificado de Inversión Virtual interactivo** (una moneda digital animada en un archivo HTML/JS optimizado para celular).\n\n` +
    `Incluye tu nombre, el activo elegido, el monto y un código de seguridad único.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Activar mi Paquete de $50k', 'menu_packages')],
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
      ])
    }
  );
});


// 6. Sección: Soporte
bot.action('menu_support', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `💬 *¿Necesitas ayuda con tu pago o tienes dudas?*\n\n` +
    `Nuestro equipo de asesores está disponible para atenderte de forma personalizada.\n\n` +
    `Escríbenos directamente a: \`@TuAliasDeSoporte\``,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
      ])
    }
  );
});


// Botón de retorno al inicio genérico
bot.action('back_to_start', async (ctx) => {
  await ctx.answerCbQuery();
  const userName = ctx.from.first_name || 'Inversionista';
  await ctx.editMessageText(
    `¡Hola, *${userName}*! 🚀\n\n¿Qué te gustaría hacer hoy? Elige una opción abajo:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Ver Paquetes de Inversión', 'menu_packages')],
        [Markup.button.callback('🎥 Ver Testimonios (Nequi / Bre-B)', 'menu_testimonials')],
        [Markup.button.callback('🛡️ ¿Cómo funciona la Garantía?', 'menu_guarantee')],
        [Markup.button.callback('💬 Hablar con Soporte', 'menu_support')]
      ])
    }
  );
});


// Iniciar el Bot
bot.launch();
console.log('🤖 Bot de Telegram en ejecución...');

// Manejo seguro de cierre
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));




