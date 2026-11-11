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
    const snapshot = await db.collection('investments').where('secureToken', '==', token).get();

    if (snapshot.empty) {
      return res.status(403).send(`
        <div style="background:#0b0f19; color:#fff; font-family:sans-serif; text-align:center; padding:50px;">
          <h2 style="color:#ef4444;">❌ Certificado No Encontrado o Inválido</h2>
          <p>El token proporcionado no está asociado a ningún pago aprobado.</p>
        </div>
      `);
    }

    res.sendFile(path.join(__dirname, 'public', 'index.html'));

  } catch (error) {
    console.error('Error validando el token en Firebase:', error);
    res.status(500).send('Error interno del servidor.');
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// CONFIGURACIÓN DE LOS COMANDOS DEL BOT
// ==========================================

// Comando /start: Selector de Idiomas Obligatorio
bot.start(async (ctx) => {
  const userName = ctx.from.first_name || 'Inversionista';
  const userId = ctx.from.id.toString();

  try {
    // Si ya existe un documento, opcionalmente podemos leer su idioma previo o resetearlo
    await db.collection('investments').doc(userId).set({
      userName,
      status: 'selecting_language'
    }, { merge: true });
  } catch (err) {
    console.error('Error guardando estado inicial:', err);
  }

  await ctx.reply(
    `¡Hola, *${userName}*! 🌍🚀\n\nPor favor, selecciona tu idioma / Please select your language:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🇪🇸 Español', 'lang_es'), Markup.button.callback('🇬🇧 English', 'lang_en')]
      ])
    }
  );
});

// Manejadores de Idioma
bot.action('lang_es', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  await db.collection('investments').doc(userId).set({ language: 'es', status: 'idle' }, { merge: true });
  await mostrarMenuPrincipal(ctx, 'es');
});

bot.action('lang_en', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  await db.collection('investments').doc(userId).set({ language: 'en', status: 'idle' }, { merge: true });
  await mostrarMenuPrincipal(ctx, 'en');
});

// Función auxiliar para mostrar el menú principal adaptado al idioma
async function mostrarMenuPrincipal(ctx, lang) {
  const userName = ctx.from.first_name || (lang === 'en' ? 'Investor' : 'Inversionista');

  const textEs = `¡Hola, *${userName}*! 🌍🚀\n\n` +
    `*¡Bienvenido a Apex Global!*\n\n` +
    `Accede a oportunidades en los mercados internacionales, selecciona el activo de tu preferencia y permite que APEX BOT identifique oportunidades de operación de forma automatizada.\n\n` +
    `💵 *Inversión inicial:* Desde 10 USD.\n` +
    `🔄 *Ciclos de operación:* 21 días.\n\n` +
    `*Apex Global — Intelligent Trading. Global Opportunities.*\n\n` +
    `⚠️ *Aviso de riesgo:* El trading y las inversiones implican riesgos. Los rendimientos no están garantizados.\n\n` +
    `¿Qué te gustaría hacer hoy? Selecciona una opción para comenzar:`;

  const textEn = `Hello, *${userName}*! 🌍🚀\n\n` +
    `*Welcome to Apex Global!*\n\n` +
    `Access international market opportunities, select your preferred asset, and let APEX BOT identify trading opportunities automatically.\n\n` +
    `💵 *Initial Investment:* From 10 USD.\n` +
    `🔄 *Trading Cycles:* 21 days.\n\n` +
    `*Apex Global — Intelligent Trading. Global Opportunities.*\n\n` +
    `⚠️ *Risk Warning:* Trading and investments involve risks. Returns are not guaranteed.\n\n` +
    `What would you like to do today? Select an option to start:`;

  const keyboardEs = Markup.inlineKeyboard([
    [Markup.button.callback('🟢 Ver Paquetes de Inversión (USDT)', 'menu_packages')],
    [Markup.button.callback('🎥 Ver Testimonios Ganadores', 'menu_testimonials')],
    [Markup.button.callback('🛡️ ¿Cómo funciona la Garantía?', 'menu_guarantee')],
    [Markup.button.callback('💬 Hablar con Soporte', 'menu_support')],
    [Markup.button.callback('🌐 Cambiar Idioma / Change Language', 'change_lang')]
  ]);

  const keyboardEn = Markup.inlineKeyboard([
    [Markup.button.callback('🟢 View Investment Packages (USDT)', 'menu_packages')],
    [Markup.button.callback('🎥 Winning Testimonials', 'menu_testimonials')],
    [Markup.button.callback('🛡️ How does the Guarantee work?', 'menu_guarantee')],
    [Markup.button.callback('💬 Contact Support', 'menu_support')],
    [Markup.button.callback('🌐 Cambiar Idioma / Change Language', 'change_lang')]
  ]);

  await ctx.editMessageText(lang === 'en' ? textEn : textEs, {
    parse_mode: 'Markdown',
    ...(lang === 'en' ? keyboardEn : keyboardEs)
  });
}

// Botón para cambiar idioma en cualquier momento
bot.action('change_lang', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `Por favor, selecciona tu idioma / Please select your language:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🇪🇸 Español', 'lang_es'), Markup.button.callback('🇬🇧 English', 'lang_en')]
      ])
    }
  );
});

// Función auxiliar para obtener el idioma actual del usuario desde Firestore
async function obtenerIdioma(userId) {
  try {
    const doc = await db.collection('investments').doc(userId).get();
    if (doc.exists && doc.data().language) {
      return doc.data().language;
    }
  } catch (err) {
    console.error('Error leyendo idioma:', err);
  }
  return 'es'; // Por defecto español
}

// Menú de Paquetes Globales Actualizado a $10 USD
bot.action('menu_packages', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = await obtenerIdioma(ctx.from.id.toString());

  const textEs = `📊 *Nuestros Planes Globales Activos*\n\n` +
    `*🟢 Paquete Global Inversor*\n` +
    `• *Inversión Base:* $10 USD (USDT)\n` +
    `• *Plazo del Ciclo:* 21 días\n` +
    `• *Rendimiento Estimado:* 15% a 25% por ciclo\n` +
    `• *Retorno Proyectado:* ~ $11.50 a $12.50 USD\n` +
    `• *Activos a elegir:* Bitcoin ₿, S&P 500 📈, Oro 🥇 o Petróleo 🛢️.\n\n` +
    `¿Deseas activar este paquete internacional ahora mismo?`;

  const textEn = `📊 *Our Active Global Plans*\n\n` +
    `*🟢 Global Investor Package*\n` +
    `• *Base Investment:* $10 USD (USDT)\n` +
    `• *Cycle Term:* 21 days\n` +
    `• *Estimated Return:* 15% to 25% per cycle\n` +
    `• *Projected Return:* ~ $11.50 to $12.50 USD\n` +
    `• *Assets to choose:* Bitcoin ₿, S&P 500 📈, Gold 🥇 or Oil 🛢️.\n\n` +
    `Do you want to activate this international package right now?`;

  const kb = lang === 'en' ? Markup.inlineKeyboard([
    [Markup.button.callback('👉 Select $10 USD Package', 'select_10usd')],
    [Markup.button.callback('⬅️ Back to Main Menu', 'back_to_start')]
  ]) : Markup.inlineKeyboard([
    [Markup.button.callback('👉 Seleccionar Paquete $10 USD', 'select_10usd')],
    [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
  ]);

  await ctx.editMessageText(lang === 'en' ? textEn : textEs, { parse_mode: 'Markdown', ...kb });
});

bot.action('select_10usd', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  const lang = await obtenerIdioma(userId);

  try {
    const userDocRef = db.collection('investments').doc(userId);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      const data = userDoc.data();
      const status = data.status;

      if (['pending_payment', 'waiting_approval', 'approved'].includes(status)) {
        const msgEs = `⚠️ *Ya tienes una inversión o proceso activo*\n\nEstado actual: *${status}*. No puedes solicitar otro paquete hasta finalizar.`;
        const msgEn = `⚠️ *You already have an active investment or process*\n\nCurrent status: *${status}*. You cannot request another package until finished.`;
        const kb = lang === 'en' ? Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back to Main Menu', 'back_to_start')]]) : Markup.inlineKeyboard([[Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]]);
        return ctx.editMessageText(lang === 'en' ? msgEn : msgEs, { parse_mode: 'Markdown', ...kb });
      }
    }

    const textEs = `✨ *¡Excelente elección! El Paquete de Inversión Inicial de $10 USD es tu puerta de entrada a los mercados.*\n\nPor favor, selecciona en qué activo deseas poner a trabajar tu capital durante los próximos 21 días:`;
    const textEn = `✨ *Great choice! The $10 USD Initial Investment Package is your gateway to the markets.*\n\nPlease select the asset where you want to put your capital to work for the next 21 days:`;

    const kb = lang === 'en' ? Markup.inlineKeyboard([
      [Markup.button.callback('₿ Bitcoin', 'asset_btc'), Markup.button.callback('📈 S&P 500', 'asset_sp500')],
      [Markup.button.callback('🥇 Gold', 'asset_gold'), Markup.button.callback('🛢️ Oil', 'asset_oil')],
      [Markup.button.callback('⬅️ Back to Main Menu', 'menu_packages')]
    ]) : Markup.inlineKeyboard([
      [Markup.button.callback('₿ Bitcoin', 'asset_btc'), Markup.button.callback('📈 S&P 500', 'asset_sp500')],
      [Markup.button.callback('🥇 Oro', 'asset_gold'), Markup.button.callback('🛢️ Petróleo', 'asset_oil')],
      [Markup.button.callback('⬅️ Volver al Menú Principal', 'menu_packages')]
    ]);

    await ctx.editMessageText(lang === 'en' ? textEn : textEs, { parse_mode: 'Markdown', ...kb });

  } catch (error) {
    console.error('Error validando estado del usuario:', error);
    await ctx.reply('❌ Error.');
  }
});

async function handleAssetSelection(ctx, selectedAsset) {
  await ctx.answerCbQuery();
  
  const userName = ctx.from.first_name || 'Inversionista';
  const userId = ctx.from.id.toString();
  const lang = await obtenerIdioma(userId);
  const amount = '10';

  try {
    const userDocRef = db.collection('investments').doc(userId);
    const userDoc = await userDocRef.get();

    if (userDoc.exists && ['pending_payment', 'waiting_approval', 'approved'].includes(userDoc.data().status)) {
      const msg = lang === 'en' ? '⚠️ You already have an active investment.' : '⚠️ Ya cuentas con una inversión activa.';
      return ctx.editMessageText(msg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', 'back_to_start')]]) });
    }

    await userDocRef.set({
      userName,
      selectedAsset,
      amount,
      currency: 'USD',
      status: 'pending_payment',
      language: lang,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error('Error al guardar en Firebase:', err);
  }

  const textEs = `✅ ¡Perfecto, *${userName}*!\n\n` +
    `Has seleccionado *${selectedAsset}* para tu ciclo de inversión de 21 días con el paquete de **$10 USD**.\n\n` +
    `💳 *Selecciona tu método de pago preferido para ver el código QR y los datos:*`;

  const textEn = `✅ Perfect, *${userName}*!\n\n` +
    `You have selected *${selectedAsset}* for your 21-day investment cycle with the **$10 USD** package.\n\n` +
    `💳 *Select your preferred payment method to view the QR code and details:*`;

  const kb = lang === 'en' ? Markup.inlineKeyboard([
    [Markup.button.callback('⚡ Pay with Binance Pay', 'pay_binance_pay')],
    [Markup.button.callback('🔗 Pay via BSC Network (USDT)', 'pay_bsc_wallet')],
    [Markup.button.callback('⬅️ Back to Main Menu', 'back_to_start')]
  ]) : Markup.inlineKeyboard([
    [Markup.button.callback('⚡ Pagar con Binance Pay', 'pay_binance_pay')],
    [Markup.button.callback('🔗 Pagar por Red BSC (USDT)', 'pay_bsc_wallet')],
    [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]
  ]);

  await ctx.editMessageText(lang === 'en' ? textEn : textEs, { parse_mode: 'Markdown', ...kb });
}

// Opción 1: Binance Pay
bot.action('pay_binance_pay', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = await obtenerIdioma(ctx.from.id.toString());
  const binanceImageUrl = `${BASE_URL}/binance.jpg`;

  const capEs = `⚡ *Pago mediante Binance Pay*\n\n` +
                `• **Binance Pay ID:** \`16869369\`\n` +
                `• **Monto Exacto:** \`10.00 USD / USDT\`\n\n` +
                `📱 *Instrucciones:*\n` +
                `1. Escanea el código QR con tu app de Binance o busca por el Binance Pay ID: \`16869369\`.\n` +
                `2. Envía exactamente \`10.00 USD\`.\n\n` +
                `📸 *Siguiente paso:* Envía en este chat la **captura de pantalla de tu pago** para que nuestro equipo lo verifique.`;

  const capEn = `⚡ *Payment via Binance Pay*\n\n` +
                `• **Binance Pay ID:** \`16869369\`\n` +
                `• **Exact Amount:** \`10.00 USD / USDT\`\n\n` +
                `📱 *Instructions:*\n` +
                `1. Scan the QR code with your Binance app or search by Binance Pay ID: \`16869369\`.\n` +
                `2. Send exactly \`10.00 USD\`.\n\n` +
                `📸 *Next step:* Send the **screenshot of your payment** in this chat for verification.`;

  try {
    await ctx.replyWithPhoto({ url: binanceImageUrl }, {
      caption: lang === 'en' ? capEn : capEs,
      parse_mode: 'Markdown'
    });
  } catch (err) {
    console.error('Error Binance Pay:', err);
    await ctx.reply('Binance Pay ID: `16869369` (Amount: 10.00 USDT). Send your payment proof here.');
  }
});

// Opción 2: Red BSC
bot.action('pay_bsc_wallet', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = await obtenerIdioma(ctx.from.id.toString());
  const bscImageUrl = `${BASE_URL}/bsc_qr.jpg`;

  const capEs = `🔗 *Pago por Red Blockchain (USDT - BSC)*\n\n` +
                `• **Red:** \`BSC (BNB Smart Chain BEP-20)\`\n` +
                `• **Dirección de Depósito:**\n\`0x27c551cc873a7040700ab0dfc0324d411d3b8f93\`\n` +
                `• **Monto Exacto:** \`10.00 USDT\`\n\n` +
                `📱 *Instrucciones:*\n` +
                `1. Escanea el QR o copia la dirección de arriba.\n` +
                `2. Envía exactamente \`10.00 USDT\` a través de la red BSC.\n\n` +
                `🔗 *Siguiente paso:* Envía en este chat el **TXID (Hash)** de tu transferencia o captura de pantalla.`;

  const capEn = `🔗 *Payment via Blockchain Network (USDT - BSC)*\n\n` +
                `• **Network:** \`BSC (BNB Smart Chain BEP-20)\`\n` +
                `• **Deposit Address:**\n\`0x27c551cc873a7040700ab0dfc0324d411d3b8f93\`\n` +
                `• **Exact Amount:** \`10.00 USDT\`\n\n` +
                `📱 *Instructions:*\n` +
                `1. Scan the QR or copy the address above.\n` +
                `2. Send exactly \`10.00 USDT\` via BSC network.\n\n` +
                `🔗 *Next step:* Send the **TXID (Hash)** or screenshot in this chat.`;

  try {
    await ctx.replyWithPhoto({ url: bscImageUrl }, {
      caption: lang === 'en' ? capEn : capEs,
      parse_mode: 'Markdown'
    });
  } catch (err) {
    console.error('Error BSC Wallet:', err);
    await ctx.reply('BSC Wallet: `0x27c551cc873a7040700ab0dfc0324d411d3b8f93` (Amount: 10.00 USDT). Send your TXID here.');
  }
});

bot.action('send_voucher', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = await obtenerIdioma(ctx.from.id.toString());
  const textEs = `📸 *Envío de Comprobante / Hash*\n\nPor favor, **envía a continuación la captura de pantalla de tu pago (Binance Pay) o el texto con el TXID (Hash)** en este chat.`;
  const textEn = `📸 *Send Voucher / Hash*\n\nPlease **send the screenshot of your payment or the TXID (Hash)** in this chat.`;
  await ctx.editMessageText(lang === 'en' ? textEn : textEs, { parse_mode: 'Markdown' });
});

bot.action('asset_btc', async (ctx) => { await handleAssetSelection(ctx, 'Bitcoin (₿)'); });
bot.action('asset_sp500', async (ctx) => { await handleAssetSelection(ctx, 'S&P 500 (📈)'); });
bot.action('asset_gold', async (ctx) => { await handleAssetSelection(ctx, 'Oro (🥇)'); });
bot.action('asset_oil', async (ctx) => { await handleAssetSelection(ctx, 'Petróleo (🛢️)'); });

bot.action('menu_testimonials', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = await obtenerIdioma(ctx.from.id.toString());
  const textEs = `🎥 *Inversores Ganadores*\n\nAquí puedes ver cómo nuestros inversores reciben sus retornos directo en sus cuentas de Binance y wallets.`;
  const textEn = `🎥 *Winning Investors*\n\nHere you can see how our investors receive their returns directly into their Binance accounts and wallets.`;
  const kb = lang === 'en' ? Markup.inlineKeyboard([[Markup.button.callback('🟢 Invest Now ($10 USD)', 'menu_packages')], [Markup.button.callback('⬅️ Back to Main Menu', 'back_to_start')]]) : Markup.inlineKeyboard([[Markup.button.callback('🟢 Invertir Ahora ($10 USD)', 'menu_packages')], [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]]);
  await ctx.editMessageText(lang === 'en' ? textEn : textEs, { parse_mode: 'Markdown', ...kb });
});

bot.action('menu_guarantee', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = await obtenerIdioma(ctx.from.id.toString());
  const textEs = `🛡️ *Tu Garantía de Inversión*\n\nAl activar tu paquete de $10 USD, recibes de forma inmediata un **Certificado Digital Encriptado** respaldado en la nube.`;
  const textEn = `🛡️ *Your Investment Guarantee*\n\nUpon activating your $10 USD package, you immediately receive an **Encrypted Digital Certificate** backed in the cloud.`;
  const kb = lang === 'en' ? Markup.inlineKeyboard([[Markup.button.callback('🟢 Activate $10 USD Package', 'menu_packages')], [Markup.button.callback('⬅️ Back to Main Menu', 'back_to_start')]]) : Markup.inlineKeyboard([[Markup.button.callback('🟢 Activar mi Paquete de $10 USD', 'menu_packages')], [Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]]);
  await ctx.editMessageText(lang === 'en' ? textEn : textEs, { parse_mode: 'Markdown', ...kb });
});

bot.action('menu_support', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = await obtenerIdioma(ctx.from.id.toString());
  const textEs = `💬 *¿Necesitas asistencia con tu pago en USDT?*\n\nEscríbenos directamente a: \`@jhonnydan05\``;
  const textEn = `💬 *Need assistance with your USDT payment?*\n\nContact us directly at: \`@jhonnydan05\``;
  const kb = lang === 'en' ? Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back to Main Menu', 'back_to_start')]]) : Markup.inlineKeyboard([[Markup.button.callback('⬅️ Volver al Menú Principal', 'back_to_start')]]);
  await ctx.editMessageText(lang === 'en' ? textEn : textEs, { parse_mode: 'Markdown', ...kb });
});

bot.action('back_to_start', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = await obtenerIdioma(ctx.from.id.toString());
  await mostrarMenuPrincipal(ctx, lang);
});

// Escuchar comprobantes y datos de pago
bot.on(['photo', 'text'], async (ctx) => {
  const userId = ctx.from.id.toString();
  const userName = ctx.from.first_name || 'Inversionista';

  try {
    const userDocRef = db.collection('investments').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) return;
    const userData = userDoc.data();
    const lang = userData.language || 'es';

    if (userData.status === 'approved' && userData.waitingForPayoutDetails === true) {
      const textMessage = ctx.message.text;
      if (!textMessage || textMessage.startsWith('/')) return;

      await userDocRef.update({
        payoutDetails: textMessage,
        waitingForPayoutDetails: false,
        payoutRegisteredAt: FieldValue.serverTimestamp()
      });

      const replyEs = `✅ *¡Datos de cobro guardados con éxito!*\n\nHemos registrado tu Binance Pay ID / Wallet USDT. Al cumplirse tus 21 días, tus ganancias serán enviadas allí.`;
      const replyEn = `✅ *Payout details saved successfully!*\n\nWe have registered your Binance Pay ID / USDT Wallet. At the end of your 21 days, your earnings will be sent there.`;

      await ctx.reply(lang === 'en' ? replyEn : replyEs, { parse_mode: 'Markdown' });

      const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
      if (ADMIN_CHAT_ID) {
        await ctx.telegram.sendMessage(
          ADMIN_CHAT_ID,
          `📌 *Wallet de Retorno Registrada*\n\n• Inversionista: ${userData.userName} (\`${userId}\`)\n• Destino USDT: \`${textMessage}\``,
          { parse_mode: 'Markdown' }
        );
      }
      return;
    }

    if (userData.status === 'pending_payment') {
      const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

      if (ctx.message.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileId = photo.file_id;

        await userDocRef.update({ status: 'waiting_approval', voucherFileId: fileId });

        const replyEs = `⏳ *Comprobante recibido con éxito.*\n\nNuestro equipo financiero está validando tu transacción USDT.`;
        const replyEn = `⏳ *Voucher received successfully.*\n\nOur financial team is validating your USDT transaction.`;
        await ctx.reply(lang === 'en' ? replyEn : replyEs, { parse_mode: 'Markdown' });

        if (ADMIN_CHAT_ID) {
          await ctx.telegram.sendPhoto(ADMIN_CHAT_ID, fileId, {
            caption: `🔔 *Nuevo Pago USDT (Captura)*\n\n• Inversionista: ${userName}\n• Telegram ID: \`${userId}\`\n• Monto: $10.00 USD`,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback(`✅ Aprobar Pago (${userId})`, `approve_${userId}`)],
              [Markup.button.callback(`❌ Rechazar`, `reject_${userId}`)]
            ])
          });
        }
      } else if (ctx.message.text && !ctx.message.text.startsWith('/')) {
        const txHash = ctx.message.text;

        await userDocRef.update({ status: 'waiting_approval', txHash: txHash });

        const replyEs = `⏳ *TXID / Hash recibido con éxito.*\n\nNuestro equipo está validando tu transacción en la blockchain.`;
        const replyEn = `⏳ *TXID / Hash received successfully.*\n\nOur team is validating your transaction on the blockchain.`;
        await ctx.reply(lang === 'en' ? replyEn : replyEs, { parse_mode: 'Markdown' });

        if (ADMIN_CHAT_ID) {
          await ctx.telegram.sendMessage(
            ADMIN_CHAT_ID,
            `🔔 *Nuevo Pago USDT (Por TXID)*\n\n• Inversionista: ${userName}\n• Telegram ID: \`${userId}\`\n• Monto: $10.00 USD\n• Hash/TXID: \`${txHash}\``,
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
      return ctx.reply('⚠️ No se encontró la inversión para este usuario.');
    }
    const userData = userDoc.data();
    const lang = userData.language || 'es';

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

    const msgEs = `🎉 ¡Pago verificado y aprobado con éxito!\n\n` +
                  `Tu ciclo global de 21 días con *${userData.selectedAsset}* ($10 USD) está activo.\n\n` +
                  `🛡️ Tu **Certificado de Garantía 3D** oficial:\n👉 ${secureCertificateUrl}\n` +
                  (vipInviteLink ? `\n📈 *Acceso a Análisis Exclusivo Global:*\n👉 ${vipInviteLink}\n` : '') +
                  `\n📥 *Último paso importante:*\nPor favor, escribe en este chat tu **Binance Pay ID** o tu **dirección de billetera USDT** (Red BSC / Polygon) donde deseas recibir tus ganancias.`;

    const msgEn = `🎉payment verified and approved successfully!\n\n` +
                  `Your 21-day global cycle with *${userData.selectedAsset}* ($10 USD) is active.\n\n` +
                  `🛡️ Your official **3D Guarantee Certificate**:\n👉 ${secureCertificateUrl}\n` +
                  (vipInviteLink ? `\n📈 *Exclusive Global Analysis Access:*\n👉 ${vipInviteLink}\n` : '') +
                  `\n📥 *Last important step:*\nplease write in this chat your **Binance Pay ID** or your **USDT wallet address** (BSC / Polygon Network) where you want to receive your earnings.`;

    await ctx.telegram.sendMessage(targetUserId, lang === 'en' ? msgEn : msgEs, { parse_mode: 'Markdown' });

    await ctx.editMessageCaption(
      `✅ *Pago Aprobado por ${adminName}*\n• Inversionista ID: \`${targetUserId}\``,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error al aprobar el pago:', error);
    ctx.reply('❌ Error al aprobar.');
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

    const userDoc = await db.collection('investments').doc(targetUserId).get();
    const lang = userDoc.exists && userDoc.data().language ? userDoc.data().language : 'es';

    const rejEs = `❌ *Lo sentimos, tu pago en USDT no pudo ser verificado.*\n\nPor favor, verifica la información o contacta a soporte.`;
    const rejEn = `❌ *Sorry, your USDT payment could not be verified.*\n\nPlease verify the information or contact support.`;

    await ctx.telegram.sendMessage(targetUserId, lang === 'en' ? rejEn : rejEs, { parse_mode: 'Markdown' });

    await ctx.editMessageCaption(
      `❌ *Pago Rechazado por ${adminName}*\n• Inversionista ID: \`${targetUserId}\``,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error al rechazar el pago:', error);
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