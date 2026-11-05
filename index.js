const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');
const fs = require('fs');
// const admin = require('firebase-admin');
require('dotenv').config();

// Extraer el objeto admin correctamente (soporte para CJS y ESM interop)
const admin = firebaseAdmin.default || firebaseAdmin;

let serviceAccount;
const secretPath = '/etc/secrets/serviceAccountKey.json';

try {
  if (fs.existsSync(secretPath)) {
    const fileContent = fs.readFileSync(secretPath, 'utf8');
    serviceAccount = JSON.parse(fileContent);
    console.log("🔐 Credenciales de Firebase cargadas correctamente desde el archivo secreto de Render.");
  } else {
    // Respaldo local para pruebas en tu PC
    serviceAccount = require('./apexbot-cd01d-firebase-adminsdk-fbsvc-92fc90bd45.json');
    console.log("💻 Credenciales cargadas desde el archivo local.");
  }
} catch (error) {
  console.error("❌ Error crítico al leer el archivo JSON de credenciales:", error.message);
  process.exit(1);
}

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. RUTA PROTEGIDA DEL CERTIFICADO (¡Debe ir ANTES de express.static!)
// ==========================================
app.get('/', async (req, res) => {
  const { token } = req.query;

  // Si no envían token de seguridad, denegamos el acceso inmediatamente
  if (!token) {
    return res.status(403).send(`
      <div style="background:#0b0f19; color:#fff; font-family:sans-serif; text-align:center; padding:50px;">
        <h2 style="color:#ef4444;">❌ Acceso Denegado</h2>
        <p>Este certificado es digital y exclusivo. No cuentas con un token de autorización válido.</p>
        <p style="color:#94a3b8; font-size:0.9rem;">Realiza tu inversión a través de nuestro bot oficial de Telegram.</p>
      </div>
    `);
  }

  try {
    // Verificar en Firestore si el token existe y está aprobado
    const snapshot = await db.collection('investments').where('secureToken', '==', token).get();

    if (snapshot.empty) {
      return res.status(403).send(`
        <div style="background:#0b0f19; color:#fff; font-family:sans-serif; text-align:center; padding:50px;">
          <h2 style="color:#ef4444;">❌ Certificado No Encontrado o Inválido</h2>
          <p>El token proporcionado no está asociado a ningún pago aprobado.</p>
        </div>
      `);
    }

    // Si el token es válido, enviamos la vista del certificado HTML
    res.sendFile(path.join(__dirname, 'public', 'index.html'));

  } catch (error) {
    console.error('Error validando el token en Firebase:', error);
    res.status(500).send('Error interno del servidor.');
  }
});

// Servir archivos estáticos auxiliares (CSS, JS, imágenes de la carpeta public)
app.use(express.static(path.join(__dirname, 'public')));

// Iniciar servidor Express
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
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'menu_packages')]
      ])
    }
  );
});

async function handleAssetSelection(ctx, selectedAsset) {
  await ctx.answerCbQuery();
  
  const userName = ctx.from.first_name || 'Inversionista';
  const userId = ctx.from.id;
  const amount = '50000';

  try {
    await db.collection('investments').doc(userId.toString()).set({
      userName,
      selectedAsset,
      amount,
      status: 'pending_payment',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('Error al guardar en Firebase:', err);
  }

  await ctx.editMessageText(
    `✅ ¡Perfecto, *${userName}*!\n\n` +
    `Has seleccionado *${selectedAsset}* para tu ciclo de 21 días con el paquete de **$50.000 COP**.\n\n` +
    `💳 *Datos para realizar tu pago:*\n` +
    `• Nequi / Bre-B: \`300 123 4567\`\n` +
    `• Titular: Apex Inversiones S.A.S.\n` +
    `• Monto exacto: $50.000 COP\n\n` +
    `📸 *Importante:* Tu certificado digital 3D y tu ciclo se activarán automáticamente **una vez verifiquemos tu pago**.\n\n` +
    `Pulsa el botón de abajo cuando hayas realizado la transferencia para enviar tu comprobante:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📸 Ya pagué, enviar comprobante', 'send_voucher')],
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
      ])
    }
  );
}

bot.action('send_voucher', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `📸 *Envío de Comprobante*\n\n` +
    `Por favor, **envía a continuación la foto de tu voucher o captura de pantalla** de la transferencia por Nequi o Bre-B en este mismo chat.\n\n` +
    `Nuestro equipo la revisará de inmediato.`,
    {
      parse_mode: 'Markdown'
    }
  );
});

bot.action('asset_btc', async (ctx) => { await handleAssetSelection(ctx, 'Bitcoin (₿)'); });
bot.action('asset_sp500', async (ctx) => { await handleAssetSelection(ctx, 'S&P 500 (📈)'); });
bot.action('asset_gold', async (ctx) => { await handleAssetSelection(ctx, 'Oro (🥇)'); });
bot.action('asset_oil', async (ctx) => { await handleAssetSelection(ctx, 'Petróleo (🛢️)'); });

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

// Escuchar cuando el usuario envía el comprobante fotográfico
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || 'Inversionista';
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const fileId = photo.file_id;

  try {
    await db.collection('investments').doc(userId.toString()).update({
      status: 'waiting_approval',
      voucherFileId: fileId
    });

    await ctx.reply(
      `⏳ *Comprobante recibido con éxito.*\n\nNuestro equipo está validando tu transferencia. En breve recibirás la confirmación y tu certificado 3D autorizado.`,
      { parse_mode: 'Markdown' }
    );

    const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
    if (ADMIN_CHAT_ID) {
      await ctx.telegram.sendPhoto(ADMIN_CHAT_ID, fileId, {
        caption: `🔔 *Nuevo Comprobante de Pago*\n\n` +
                 `• Inversionista: ${userName}\n` +
                 `• Telegram ID: \`${userId}\`\n` +
                 `• Monto: $50.000 COP`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(`✅ Aprobar Pago (${userId})`, `approve_${userId}`)],
          [Markup.button.callback(`❌ Rechazar`, `reject_${userId}`)]
        ])
      });
    }
  } catch (error) {
    console.error('Error procesando el comprobante:', error);
    await ctx.reply('Hubo un error al procesar tu comprobante. Por favor intenta de nuevo.');
  }
});

// Aprobación del administrador
bot.action(/^approve_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const targetUserId = ctx.match[1];

  try {
    const secureToken = 'APEX-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    await db.collection('investments').doc(targetUserId).update({
      status: 'approved',
      secureToken: secureToken,
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const userDoc = await db.collection('investments').doc(targetUserId).get();
    const userData = userDoc.data();

    const baseUrl = process.env.BASE_URL || 'https://inversion-bot-9ewg.onrender.com';
    const secureCertificateUrl = `${baseUrl}/?token=${secureToken}&name=${encodeURIComponent(userData.userName)}&asset=${encodeURIComponent(userData.selectedAsset)}&amount=${userData.amount}`;

    await ctx.telegram.sendMessage(
      targetUserId,
      `🎉 ¡Pago verificado y aprobado con éxito!\n\n` +
      `Tu ciclo de 21 días con *${userData.selectedAsset}* está oficialmente activo.\n\n` +
      `🛡️ Ya puedes abrir tu **Certificado de Garantía 3D** oficial y seguro en el siguiente enlace:\n\n` +
      `👉 ${secureCertificateUrl}`,
      { parse_mode: 'Markdown' }
    );

    await ctx.editMessageCaption(`✅ *Pago Aprobado con éxito para el usuario* \`${targetUserId}\``, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error al aprobar el pago:', error);
    await ctx.reply('❌ Ocurrió un error al aprobar la inversión.');
  }
});

bot.launch();
console.log('🤖 Bot de Telegram en ejecución...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));