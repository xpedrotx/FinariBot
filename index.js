const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const transactions = [];

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('🔍 Escaneie o QR code acima no WhatsApp');
});

client.on('ready', () => {
  console.log('🤖 Assistente financeiro pronto!');
});

client.on('message', async msg => {
  try {
    const text = msg.body.toLowerCase();
    const delaySeconds = Math.floor(Math.random() * 5) + 1;

    console.log(`Mensagem recebida: "${msg.body}" | Delay: ${delaySeconds}s`);

    const chat = await msg.getChat();
    if (chat) {
      await chat.sendStateTyping();
    }

    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));

    if (/(ganhei|recebi|faturei|\+)\s*[\d,\.]+/.test(text)) {
      await handleTransaction(msg, 'Receita');
    }
    else if (/(gastei|paguei|comprei|\-)\s*[\d,\.]+/.test(text)) {
      await handleTransaction(msg, 'Despesa');
    }
    else if (/excluir transação\s+\w+/i.test(text)) {
      await handleDelete(msg);
    }
    else if (/extrato|resumo/i.test(text)) {
      await handleSummary(msg);
    }
    else if (/quanto gastei com .+ esse mês/i.test(text)) {
      await handleGastoCategoriaMes(msg);
    }
    else if (/quanto gastei com .+(em|no mês de|no mes de|no mês|no mes)\s+[\w\d]+/i.test(text)) {
      await handleGastoCategoriaOutroMes(msg);
    }    

  } catch (error) {
    console.error('Erro:', error);
    msg.reply('❌ Ocorreu um erro ao processar sua solicitação');
  }
});

// Receitas e despesas

async function handleTransaction(msg, type) {
  const value = extractValue(msg.body);
  const transactionId = generateId();
  const description = extrairDescricao(msg.body);
  const category = definirCategoria(description);
  const date = extrairData(msg.body);

  if (date === 'INVALID_DATE') {
    return msg.reply('❌ Data inválida informada. Verifique o formato e tente novamente (ex: 20/02/2024)');
  }

  const newTransaction = {
    transactionId,
    description,
    value: type === 'Receita' ? value : -value,
    type,
    category,
    date,
    paid: true
  };

  transactions.push(newTransaction);

  const response = `*Transação Registrada com Sucesso!*\n\n` +
  `Identificador: ${transactionId}\n\n` +
  `📋 *Resumo da Transação:*\n` +
  `───────────────────────\n` +
  `🔖 *Descrição:* ${description || 'Sem descrição'}\n` +
  `💸 *Valor:* R$ ${value.toFixed(2)}\n` +
  `🔄 *Tipo:* ${type === 'Receita' ? '🟩 Receita' : '🟥 Despesa'}\n` +
  `🔖 *Categoria:* ${category}\n` +
  `🏦 *Conta:* Não Informado\n` +
  `🗓️ *Data:* ${date.toLocaleDateString('pt-BR')}\n\n` +
  `💵 Pago: ✅\n\n` +
  `❌ Quer excluir essa transação? Basta digitar: "Excluir transação ${transactionId}" e pronto!`;
  

  await msg.reply(response);
}

// Excluir Receita ou Despesa
async function handleDelete(msg) {
  const match = msg.body.match(/excluir transação\s+(\w+)/i);
  if (!match) {
    return msg.reply('❌ Formato inválido. Use: "excluir transação CÓDIGO"');
  }

  const transactionId = match[1].toUpperCase();
  const index = transactions.findIndex(t => t.transactionId === transactionId);

  if (index !== -1) {
    const removed = transactions.splice(index, 1)[0];
    msg.reply(`🗑️ Transação *${transactionId}* removida com sucesso!\n` +
              `💰 Valor: R$ ${Math.abs(removed.value).toFixed(2)}\n` +
              `📅 Data: ${new Date(removed.date).toLocaleDateString('pt-BR')}`);
  } else {
    msg.reply(`⚠️ Não encontrei nenhuma transação com o código *${transactionId}*`);
  }
}

// Extrato
async function handleSummary(msg) {
  if (transactions.length === 0) {
    return msg.reply('📭 Nenhuma transação registrada ainda.');
  }

  let totalReceitas = 0;
  let totalDespesas = 0;

  const resumo = transactions.slice(-5).reverse().map(t => {
    const emoji = t.type === 'Receita' ? '🟩' : '🟥';
    const valor = `R$ ${Math.abs(t.value).toFixed(2)}`;
    const data = new Date(t.date).toLocaleDateString('pt-BR');

    if (t.type === 'Receita') totalReceitas += t.value;
    else totalDespesas += Math.abs(t.value);

    return `${emoji} *${t.type}* | ${valor}\n📅 ${data} | 📝 ${t.description} | 🆔 ${t.transactionId}`;
  });

  const saldo = totalReceitas - totalDespesas;

  const resumoTexto = `*📊 Extrato Financeiro*\n\n` +
    `🟢 Total Receitas: R$ ${totalReceitas.toFixed(2)}\n` +
    `🔴 Total Despesas: R$ ${totalDespesas.toFixed(2)}\n` +
    `💰 *Saldo Atual:* R$ ${saldo.toFixed(2)}\n\n` +
    `🕓 Últimas Transações:\n\n` +
    resumo.join('\n\n');

  await msg.reply(resumoTexto);
}

// Gasto no mês atual
async function handleGastoCategoriaMes(msg) {
  const match = msg.body.match(/quanto gastei com (.+) esse mês/i);
  if (!match || !match[1]) {
    return msg.reply('❌ Não entendi qual categoria você quer consultar.');
  }

  const termo = match[1].toLowerCase().trim();
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const gastosFiltrados = transactions.filter(t => {
    const data = new Date(t.date);
    return (
      t.type === 'Despesa' &&
      data.getMonth() === mesAtual &&
      data.getFullYear() === anoAtual &&
      t.description.toLowerCase().includes(termo)
    );
  });

  const total = gastosFiltrados.reduce((acc, t) => acc + Math.abs(t.value), 0);

  if (gastosFiltrados.length === 0) {
    const nomeMesExibido = getNomeMes(mesAtual);
    return msg.reply(`📭 Nenhuma despesa com "${termo}" em ${nomeMesExibido}.`);
  }  

  let resposta = `💸 Você gastou *R$ ${total.toFixed(2)}* com *${termo}* neste mês.\n\n`;
  resposta += `📌 Transações:\n\n` + gastosFiltrados.map(t => {
    const data = new Date(t.date).toLocaleDateString('pt-BR');
    return `🟥 R$ ${Math.abs(t.value).toFixed(2)} - ${t.description} (${data})`;
  }).join('\n');

  await msg.reply(resposta);
}

// Gasto em outros meses
async function handleGastoCategoriaOutroMes(msg) {
  const match = msg.body.match(/quanto gastei com (.+?) (?:em|no mês de|no mes de|no mês|no mes)\s+([\w\d\/]+)/i);
  if (!match || !match[1] || !match[2]) {
    return msg.reply('❌ Formato inválido. Tente:\n- "quanto gastei com ifood em fevereiro"\n- "no mês 3"\n- "no mês 1/2024"');
  }

  const termo = match[1].toLowerCase().trim();
  const mesAno = match[2].toLowerCase().trim();

  // Separar o mês e o ano
  const [mesInput, anoInput] = mesAno.includes('/')
    ? mesAno.split('/')
    : [mesAno, null];

  const anoFinal = anoInput ? parseInt(anoInput) : new Date().getFullYear();


  // Suporte a nomes, abreviações e números
  const meses = {
    janeiro: 0, jan: 0, "1": 0, "01": 0,
    fevereiro: 1, fev: 1, "2": 1, "02": 1,
    março: 2, marco: 2, mar: 2, "3": 2, "03": 2,
    abril: 3, abr: 3, "4": 3, "04": 3,
    maio: 4, "5": 4, "05": 4,
    junho: 5, jun: 5, "6": 5, "06": 5,
    julho: 6, jul: 6, "7": 6, "07": 6,
    agosto: 7, ago: 7, "8": 7, "08": 7,
    setembro: 8, set: 8, "9": 8, "09": 8,
    outubro: 9, out: 9, "10": 9,
    novembro: 10, nov: 10, "11": 10,
    dezembro: 11, dez: 11, "12": 11
  };

  // Normaliza e localiza o mês
  const mesNormalizado = mesInput.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const mesBuscado = meses[mesInput] ?? meses[mesNormalizado];
  const anoAtual = anoFinal;  

  if (mesBuscado === undefined) {
    return msg.reply(`❌ Mês "${mesInput}" não reconhecido. Tente algo como "março", "3" ou "setembro".`);
  }
  

  const nomeMesExibido = getNomeMes(mesBuscado);

  // Filtra transações
  const gastosFiltrados = transactions.filter(t => {
    const data = new Date(t.date);
    return (
      t.type === 'Despesa' &&
      data.getMonth() === mesBuscado &&
      data.getFullYear() === anoAtual &&
      t.description.toLowerCase().includes(termo)
    );
  });

  const total = gastosFiltrados.reduce((acc, t) => acc + Math.abs(t.value), 0);

  if (gastosFiltrados.length === 0) {
    return msg.reply(`📭 Nenhuma despesa com "${termo}" em ${nomeMesExibido}.`);
  }

  let resposta = `📅 Gastos com *${termo}* em *${nomeMesExibido}*: *R$ ${total.toFixed(2)}*\n\n`;
  resposta += `📌 Transações:\n\n` + gastosFiltrados.map(t => {
    const data = new Date(t.date).toLocaleDateString('pt-BR');
    return `🟥 R$ ${Math.abs(t.value).toFixed(2)} - ${t.description} (${data})`;
  }).join('\n');

  await msg.reply(resposta);
}


function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


// Utilidades

function definirCategoria(texto) {
  const txt = texto.toLowerCase();
  if (txt.includes('mercado')) return 'Mercado';
  if (txt.includes('aluguel')) return 'Moradia';
  if (txt.includes('luz') || txt.includes('água') || txt.includes('conta')) return 'Contas';
  if (txt.includes('uber') || txt.includes('transporte')) return 'Transporte';
  if (txt.includes('ifood') || txt.includes('pizza') || txt.includes('comida')) return 'Alimentação';
  if (txt.includes('salário') || txt.includes('freela')) return 'Renda';
  if (txt.includes('jogo') || txt.includes('valorant')) return 'Lazer';
  if (txt.includes('presente') || txt.includes('roupa')) return 'Pessoal';
  return 'Outros';
}

function extractValue(text) {
  const match = text.replace(',', '.').match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[0]) : 0;
}

function extrairDescricao(texto) {
  const match = texto.replace(',', '.').match(/(?:ganhei|recebi|faturei|gastei|paguei|comprei|\+|\-)?\s*\d+\.?\d*\s*(.*?)\s*(em\s+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})?$/i);
  return match && match[1] ? match[1].trim() : texto.trim();
}

function extrairData(texto) {
  const match = texto.match(/em\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i);
  if (match) {
    const [ , dia, mes, ano ] = match;
    const data = new Date(`${ano}-${mes}-${dia}T00:00:00`);
    if (
      data.getDate() !== parseInt(dia) ||
      data.getMonth() + 1 !== parseInt(mes) ||
      data.getFullYear() !== parseInt(ano)
    ) {
      return 'INVALID_DATE';
    }
    return data;
  }
  return new Date();
}

function generateId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

client.initialize();

function getNomeMes(indice) {
  const nomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril',
    'Maio', 'Junho', 'Julho', 'Agosto',
    'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return nomes[indice] || 'Mês inválido';
}
