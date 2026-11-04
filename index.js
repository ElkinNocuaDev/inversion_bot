const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

// 1. Configurar Express para servir archivos estáticos de la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// 2. Iniciar el servidor web de Express
app.listen(PORT, () => {
  console.log(`🌐 Servidor web y certificado en línea en el puerto ${PORT}`);
});

// ==========================================
// CONFIGURACIÓN DE LOS COMANDOS DEL BOT
// ==========================================

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

// Menú de Paquetes Actualizado con Proyección de Ganancias Clara
bot.action('menu_packages', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `📊 *Nuestros Planes Activos*\n\n` +
    `*🟢 Paquete Nuevo Inversor*\n` +
    `• *Inversión Base:* $50.000 COP\n` +
    `• *Plazo del Ciclo:* 21 días\n` +
    `• *Rendimiento Estimado:* 15% a 25% por ciclo\n` +
    `• *Retorno Proyectado:* ~ $57.500 a $62.500 COP\n` +
    `• *Activos a elegir:* Bitcoin ₿, S&P 500 📈, Oro 🥇 o Petróleo 🛢️.\n\n` +
    `¿Deseas activar este paquete ahora mismo?`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('👉 Seleccionar Paquete $50.000 COP', 'select_50k')],
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
      ])
    }
  );
});

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

// Función auxiliar reutilizable para generar la respuesta con el certificado personalizado
async function handleAssetSelection(ctx, selectedAsset) {
  await ctx.answerCbQuery();
  
  const userName = ctx.from.first_name || 'Inversionista';
  const amount = '50000';

  // URL base (cambiar por tu dominio real en producción)
  const baseUrl = process.env.BASE_URL || 'https://inversion-bot-9ewg.onrender.com';
  const certificateUrl = `${baseUrl}/?name=${encodeURIComponent(userName)}&asset=${encodeURIComponent(selectedAsset)}&amount=${amount}`;

  await ctx.editMessageText(
    `✅ ¡Perfecto, *${userName}*!\n\n` +
    `Has seleccionado *${selectedAsset}* para tu ciclo de 21 días con el paquete de **$50.000 COP**.\n\n` +
    `🛡️ Hemos generado tu **Certificado de Garantía Virtual** exclusivo.\n\n` +
    `💳 *Datos para realizar tu pago:*\n` +
    `• Nequi / Bre-B: \`300 123 4567\`\n` +
    `• Titular: Apex Inversiones S.A.S.\n` +
    `• Monto exacto: $50.000 COP\n\n` +
    `Una vez realices el pago, abre tu certificado y pulsa el botón de abajo para enviar tu comprobante:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('🌐 Abrir mi Certificado 3D', certificateUrl)],
        [Markup.button.callback('📸 Ya pagué, enviar comprobante', 'send_voucher')],
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
      ])
    }
  );
}

// Acción simulada para el flujo de comprobante (Nivel Semi-Automático)
bot.action('send_voucher', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `📸 Por favor, envía a continuación la **foto del comprobante (voucher)** de tu pago por Nequi o Bre-B.\n\n` +
    `Nuestro equipo validará la transacción y activará tu ciclo de inmediato.`
  );
});

// Eventos para cada activo disponible
bot.action('asset_btc', async (ctx) => {
  await handleAssetSelection(ctx, 'Bitcoin (₿)');
});

bot.action('asset_sp500', async (ctx) => {
  await handleAssetSelection(ctx, 'S&P 500 (📈)');
});

bot.action('asset_gold', async (ctx) => {
  await handleAssetSelection(ctx, 'Oro (🥇)');
});

bot.action('asset_oil', async (ctx) => {
  await handleAssetSelection(ctx, 'Petróleo (🛢️)');
});

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

bot.action('menu_guarantee', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🛡️ *Tu Garantía de Inversión*\n\n` +
    `Queremos que te sientas 100% seguro. Al activar cualquier paquete, recibes de forma inmediata un **Certificado de Inversión Virtual interactivo** (una moneda digital animada).\n\n` +
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

// Lanzar el Bot de Telegram
bot.launch();
console.log('🤖 Bot de Telegram en ejecución...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));