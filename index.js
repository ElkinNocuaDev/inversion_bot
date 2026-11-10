const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
require('dotenv').config();

let serviceAccount;
const secretPath = '/etc/secrets/serviceAccountKey.json';

try {
  if (fs.existsSync(secretPath)) {
    const rawContent = fs.readFileSync(secretPath, 'utf8');
    serviceAccount = JSON.parse(rawContent);
    console.log("🔐 Credenciales parseadas con éxito. Project ID:", serviceAccount.project_id);
  } else {
    serviceAccount = require('./apexbot-cd01d-firebase-adminsdk-fbsvc-92fc90bd45.json');
    console.log("💻 Credenciales cargadas desde el archivo local.");
  }
} catch (error) {
  console.error("❌ Error crítico al parsear el JSON de credenciales:", error.message);
  process.exit(1);
}

// Inicializar Firebase utilizando directamente la función cert
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'https://inversion-bot-9ewg.onrender.com';
const WEBHOOK_PATH = `/telegram-webhook-${process.env.BOT_TOKEN.split(':')[0]}`;

// ==========================================
// 1. RUTA PROTEGIDA DEL CERTIFICADO Y SALUD (HEALTH CHECK)
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

// ==========================================
// CONFIGURACIÓN DE LOS COMANDOS DEL BOT
// ==========================================

bot.start((ctx) => {
  const userName = ctx.from.first_name || 'Inversionista';

  ctx.reply(
    `¡Hola, *${userName}*! 🌍🚀

*¡Bienvenido a Apex Global!*

Accede a oportunidades en los mercados internacionales, selecciona el activo de tu preferencia y permite que APEX BOT identifique oportunidades de operación de forma automatizada.

💵 *Inversión inicial:* Desde 10 USD.
🔄 *Ciclos de operación:* 21 días.

*Apex Global — Intelligent Trading. Global Opportunities.*

⚠️ *Aviso de riesgo:*
El trading y las inversiones en mercados financieros implican riesgos. Los rendimientos no están garantizados y es posible perder parte o la totalidad del capital invertido. Los resultados pasados no garantizan resultados futuros.

¿Qué te gustaría hacer hoy? Selecciona una opción para comenzar:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Ver Paquetes de Inversión (USDT)', 'menu_packages')],
        [Markup.button.callback('🎥 Ver Testimonios Ganadores', 'menu_testimonials')],
        [Markup.button.callback('🛡️ ¿Cómo funciona la Garantía?', 'menu_guarantee')],
        [Markup.button.callback('💬 Hablar con Soporte', 'menu_support')]
      ])
    }
  );
});

// Menú de Paquetes Globales Actualizado a $10 USD
bot.action('menu_packages', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `📊 *Nuestros Planes Globales Activos*\n\n` +
    `*🟢 Paquete Global Inversor*\n` +
    `• *Inversión Base:* $10 USD (USDT)\n` +
    `• *Plazo del Ciclo:* 21 días\n` +
    `• *Rendimiento Estimado:* 15% a 25% por ciclo\n` +
    `• *Retorno Proyectado:* ~ $11.50 a $12.50 USD\n` +
    `• *Activos a elegir:* Bitcoin ₿, S&P 500 📈, Oro 🥇 o Petróleo 🛢️.\n\n` +
    `¿Deseas activar este paquete internacional ahora mismo?`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('👉 Seleccionar Paquete $10 USD', 'select_10usd')],
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
      ])
    }
  );
});

bot.action('select_10usd', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();

  try {
    const userDocRef = db.collection('investments').doc(userId);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      const data = userDoc.data();
      const status = data.status;

      if (status === 'pending_payment' || status === 'waiting_approval' || status === 'approved') {
        return ctx.editMessageText(
          `⚠️ *Ya tienes una inversión o proceso activo*\n\n` +
          `Actualmente posees un estado de tipo: *${status}*.\n` +
          `No puedes solicitar un nuevo paquete hasta que tu ciclo actual finalice o tu pago pendiente sea procesado.`,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
            ])
          }
        );
      }
    }

    await ctx.editMessageText(
      `✨ *¡Excelente elección! El Paquete Global de $10 USD es tu puerta de entrada internacional.*\n\n` +
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

  } catch (error) {
    console.error('Error validando estado del usuario:', error);
    await ctx.reply('❌ Ocurrió un error al verificar tu estado. Intenta de nuevo.');
  }
});

async function handleAssetSelection(ctx, selectedAsset) {
  await ctx.answerCbQuery();
  
  const userName = ctx.from.first_name || 'Inversionista';
  const userId = ctx.from.id;
  const amount = '10'; // Monto en USD

  try {
    const userDocRef = db.collection('investments').doc(userId.toString());
    const userDoc = await userDocRef.get();

    if (userDoc.exists && ['pending_payment', 'waiting_approval', 'approved'].includes(userDoc.data().status)) {
      return ctx.editMessageText(
        `⚠️ Ya cuentas con una inversión activa o en proceso de validación. No puedes registrar otra simultáneamente.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
          ])
        }
      );
    }

    await userDocRef.set({
      userName,
      selectedAsset,
      amount,
      currency: 'USD',
      status: 'pending_payment',
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('Error al guardar en Firebase:', err);
  }

  // Menú interactivo para elegir el método de pago cripto
  await ctx.editMessageText(
    `✅ ¡Perfecto, *${userName}*!\n\n` +
    `Has seleccionado *${selectedAsset}* para tu ciclo de inversión de 21 días con el paquete de **$10 USD**.\n\n` +
    `💳 *Selecciona tu método de pago preferido para ver el código QR y los datos:*`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('⚡ Pagar con Binance Pay', 'pay_binance_pay')],
        [Markup.button.callback('🔗 Pagar por Red BSC (USDT)', 'pay_bsc_wallet')],
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
      ])
    }
  );
}

// Opción 1: Binance Pay (Envía imagen QR + Nickname)
bot.action('pay_binance_pay', async (ctx) => {
  await ctx.answerCbQuery();
  
  const binanceImageUrl = `${BASE_URL}/binance.jpg`;

  try {
    await ctx.replyWithPhoto(
      { url: binanceImageUrl },
      {
        caption: `⚡ *Pago mediante Binance Pay*\n\n` +
                 `• **Binance Pay ID:** \`16869369\`\n` +
                 `• **Monto Exacto:** \`10.00 USD / USDT\`\n\n` +
                 `📱 *Instrucciones:*\n` +
                 `1. Escanea el código QR con tu app de Binance o busca por el Binance Pay ID: \`16869369\`.\n` +
                 `2. Envía exactamente \`10.00 USD\`.\n\n` +
                 `📸 *Siguiente paso:* Envía en este chat la **captura de pantalla de tu pago** para que nuestro equipo lo verifique.`,
        parse_mode: 'Markdown'
      }
    );
  } catch (err) {
    console.error('Error enviando inversión por Binance Pay:', err);
    await ctx.reply('⚡ Binance Pay ID: `16869369` (Monto: 10.00 USDT). Envía tu captura de pago aquí.');
  }
});

// Opción 2: Red BSC / Polygon (Envía imagen QR del contrato/wallet + Dirección)
bot.action('pay_bsc_wallet', async (ctx) => {
  await ctx.answerCbQuery();

  const bscImageUrl = `${BASE_URL}/bsc_qr.jpg`;

  try {
    await ctx.replyWithPhoto(
      { url: bscImageUrl },
      {
        caption: `🔗 *Pago por Red Blockchain (USDT - BSC)*\n\n` +
                 `• **Red:** \`BSC (BNB Smart Chain BEP-20)\`\n` +
                 `• **Dirección de Depósito:**\n\`0x27c551cc873a7040700ab0dfc0324d411d3b8f93\`\n` +
                 `• **Monto Exacto:** \`10.00 USDT\`\n\n` +
                 `📱 *Instrucciones:*\n` +
                 `1. Escanea el QR o copia la dirección de arriba.\n` +
                 `2. Envía exactamente \`10.00 USDT\` a través de la red BSC.\n\n` +
                 `🔗 *Siguiente paso:* Envía en este chat el **TXID (Hash)** de tu transferencia o la captura de pantalla de la red para validarlo.`,
        parse_mode: 'Markdown'
      }
    );
  } catch (err) {
    console.error('Error enviando inversión por la red BSC:', err);
    await ctx.reply('🔗 Red BSC (BEP-20) Wallet: `0x27c551cc873a7040700ab0dfc0324d411d3b8f93` (Monto: 10.00 USDT). Envía tu TXID aquí.');
  }
});

bot.action('send_voucher', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `📸 *Envío de Comprobante / Hash*\n\n` +
    `Por favor, **envía a continuación la captura de pantalla de tu pago (Binance Pay) o el texto con el TXID (Hash)** de la transferencia en este mismo chat.\n\n` +
    `Nuestro equipo financiero lo validará de inmediato.`,
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
    `🎥 *Inversores Ganadores*\n\n` +
    `Aquí puedes ver cómo nuestros inversores reciben sus retornos directo en sus cuentas de Binance y wallets descentralizadas.\n\n` +
    `*(Espacio reservado para capturas de pagos exitosos en USDT)*`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Invertir Ahora ($10 USD)', 'menu_packages')],
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
      ])
    }
  );
});

bot.action('menu_guarantee', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🛡️ *Tu Garantía de Inversión*\n\n` +
    `Al activar tu paquete de $10 USD, recibes de forma inmediata un **Certificado Digital Encriptado** respaldado en la nube.\n\n` +
    `Incluye tu nombre, el activo elegido, el monto en USD y un código de seguridad único verifiable.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Activar mi Paquete de $10 USD', 'menu_packages')],
        [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
      ])
    }
  );
});

bot.action('menu_support', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `💬 *¿Necesitas asistencia con tu pago en USDT?*\n\n` +
    `Nuestro equipo de soporte está disponible para ayudarte.\n\n` +
    `Escríbenos directamente a: \`@jhonnydan05\``,
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
    `¡Hola, *${userName}*! 🌍🚀\n\n¿Qué te gustaría hacer hoy? Elige una opción abajo:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Ver Paquetes de Inversión (USDT)', 'menu_packages')],
        [Markup.button.callback('🎥 Ver Testimonios Ganadores', 'menu_testimonials')],
        [Markup.button.callback('🛡️ ¿Cómo funciona la Garantía?', 'menu_guarantee')],
        [Markup.button.callback('💬 Hablar con Soporte', 'menu_support')]
      ])
    }
  );
});

// Escuchar cuando el usuario envía el comprobante (foto o texto/TXID)
bot.on(['photo', 'text'], async (ctx) => {
  const userId = ctx.from.id.toString();
  const userName = ctx.from.first_name || 'Inversionista';

  try {
    const userDocRef = db.collection('investments').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) return;
    const userData = userDoc.data();

    // 1. Manejar la recepción de datos de cobro (Wallet USDT / Binance Pay ID)
    if (userData.status === 'approved' && userData.waitingForPayoutDetails === true) {
      const textMessage = ctx.message.text;
      if (!textMessage || textMessage.startsWith('/')) return;

      await userDocRef.update({
        payoutDetails: textMessage,
        waitingForPayoutDetails: false,
        payoutRegisteredAt: FieldValue.serverTimestamp()
      });

      await ctx.reply(
        `✅ *¡Datos de cobro guardados con éxito!*\n\n` +
        `Hemos registrado tu Binance Pay ID / Wallet USDT. Al cumplirse tus 21 días, tus ganancias serán enviadas directamente allí.\n\n` +
        `¡Mucho éxito en tu ciclo global con Apex! 🚀`,
        { parse_mode: 'Markdown' }
      );

      const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
      if (ADMIN_CHAT_ID) {
        await ctx.telegram.sendMessage(
          ADMIN_CHAT_ID,
          `📌 *Wallet de Retorno Registrada*\n\n` +
          `• Inversionista: ${userData.userName} (\`${userId}\`)\n` +
          `• Destino USDT: \`${textMessage}\``,
          { parse_mode: 'Markdown' }
        );
      }
      return;
    }

    // 2. Manejar la recepción del comprobante de pago (Foto o TXID en texto)
    if (userData.status === 'pending_payment') {
      const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

      if (ctx.message.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileId = photo.file_id;

        await userDocRef.update({
          status: 'waiting_approval',
          voucherFileId: fileId
        });

        await ctx.reply(
          `⏳ *Comprobante recibido con éxito.*\n\nNuestro equipo financiero está validando tu transacción USDT. En breve recibirás tu certificado 3D.`,
          { parse_mode: 'Markdown' }
        );

        if (ADMIN_CHAT_ID) {
          await ctx.telegram.sendPhoto(ADMIN_CHAT_ID, fileId, {
            caption: `🔔 *Nuevo Pago USDT (Captura)*\n\n` +
                     `• Inversionista: ${userName}\n` +
                     `• Telegram ID: \`${userId}\`\n` +
                     `• Monto: $10.00 USD`,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback(`✅ Aprobar Pago (${userId})`, `approve_${userId}`)],
              [Markup.button.callback(`❌ Rechazar`, `reject_${userId}`)]
            ])
          });
        }
      } else if (ctx.message.text && !ctx.message.text.startsWith('/')) {
        const txHash = ctx.message.text;

        await userDocRef.update({
          status: 'waiting_approval',
          txHash: txHash
        });

        await ctx.reply(
          `⏳ *TXID / Hash recibido con éxito.*\n\nNuestro equipo financiero está validando tu transacción en la blockchain. En breve recibirás tu certificado 3D.`,
          { parse_mode: 'Markdown' }
        );

        if (ADMIN_CHAT_ID) {
          await ctx.telegram.sendMessage(
            ADMIN_CHAT_ID,
            `🔔 *Nuevo Pago USDT (Por TXID)*\n\n` +
            `• Inversionista: ${userName}\n` +
            `• Telegram ID: \`${userId}\`\n` +
            `• Monto: $10.00 USD\n` +
            `• Hash/TXID: \`${txHash}\``,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback(`✅ Aprobar Pago (${userId})`, `approve_${userId}`)],
                [Markup.button.callback(`❌ Rechazar`, `reject_${userId}`)]
              ])
            }
          );
        }
      }
    }

  } catch (error) {
    console.error('Error procesando mensaje:', error);
  }
});

// ==========================================
// ACCIONES DEL ADMINISTRADOR (APROBAR / RECHAZAR)
// ==========================================

bot.action(/^approve_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const targetUserId = ctx.match[1];
  const adminName = ctx.from.first_name || 'Admin';

  try {
    const secureToken = 'APEX-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    await db.collection('investments').doc(targetUserId).update({
      status: 'approved',
      waitingForPayoutDetails: true,
      secureToken: secureToken,
      approvedAt: FieldValue.serverTimestamp()
    });

    const userDoc = await db.collection('investments').doc(targetUserId).get();
    if (!userDoc.exists) {
      return ctx.reply('⚠️ No se encontró la inversión para este usuario en la base de datos.');
    }
    const userData = userDoc.data();

    const secureCertificateUrl = `${BASE_URL}/?token=${secureToken}&name=${encodeURIComponent(userData.userName)}&asset=${encodeURIComponent(userData.selectedAsset)}&amount=${userData.amount}`;

    const VIP_CHAT_ID = process.env.VIP_CHAT_ID; 
    let vipInviteLink = '';
    
    if (VIP_CHAT_ID) {
      const inviteLinkObj = await ctx.telegram.createChatInviteLink(VIP_CHAT_ID, {
        member_limit: 1,
        expire_date: Math.floor(Date.now() / 1000) + 86400
      });
      vipInviteLink = inviteLinkObj.invite_link;
    }

    let messageText = `🎉 ¡Pago verificado y aprobado con éxito!\n\n` +
                      `Tu ciclo global de 21 días con *${userData.selectedAsset}* ($10 USD) está activo.\n\n` +
                      `🛡️ Tu **Certificado de Garantía 3D** oficial:\n👉 ${secureCertificateUrl}\n`;

    if (vipInviteLink) {
      messageText += `\n📈 *Acceso a Análisis Exclusivo Global:*\n` +
                     `Acceso a nuestro canal privado de análisis técnico para Bitcoin, S&P 500, Oro y Petróleo:\n` +
                     `👉 ${vipInviteLink}\n`;
    }

    messageText += `\n📥 *Último paso importante:*\n` +
                   `Por favor, escribe en este chat tu **Binance Pay ID** o tu **dirección de billetera USDT** (Red BSC / Polygon) donde deseas recibir tus ganancias al finalizar el ciclo.`;

    await ctx.telegram.sendMessage(targetUserId, messageText, { parse_mode: 'Markdown' });

    await ctx.editMessageCaption(
      `✅ *Pago Aprobado por ${adminName}*\n• Inversionista ID: \`${targetUserId}\``,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error al aprobar el pago:', error);
    await ctx.reply('❌ Ocurrió un error al aprobar la inversión en la base de datos.');
  }
});

bot.action(/^reject_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const targetUserId = ctx.match[1];
  const adminName = ctx.from.first_name || 'Admin';

  try {
    await db.collection('investments').doc(targetUserId).update({
      status: 'rejected',
      rejectedAt: FieldValue.serverTimestamp()
    });

    await ctx.telegram.sendMessage(
      targetUserId,
      `❌ *Lo sentimos, tu pago en USDT no pudo ser verificado.*\n\n` +
      `Es posible que el Hash/TXID sea incorrecto, el monto no coincida o la captura no sea legible.\n\n` +
      `Por favor, verifica la información o contacta a soporte.`,
      { parse_mode: 'Markdown' }
    );

    await ctx.editMessageCaption(
      `❌ *Pago Rechazado por ${adminName}*\n• Inversionista ID: \`${targetUserId}\``,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error al rechazar el pago:', error);
    await ctx.reply('❌ Ocurrió un error al procesar el rechazo.');
  }
});

// ==========================================
// INTEGRACIÓN DEL WEBHOOK CON EXPRESS Y INICIO DEL SERVIDOR
// ==========================================

app.use(bot.webhookCallback(WEBHOOK_PATH));

app.listen(PORT, async () => {
  console.log(`🌐 Servidor web y certificado en línea en el puerto ${PORT}`);

  try {
    await bot.telegram.setWebhook(`${BASE_URL}${WEBHOOK_PATH}`);
    console.log(`🤖 Webhook de Telegram configurado exitosamente en: ${BASE_URL}${WEBHOOK_PATH}`);
  } catch (error) {
    console.error('❌ Error configurando el Webhook en Telegram:', error);
  }
});