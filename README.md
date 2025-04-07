# 🤖 Finari - Assistente Financeiro no WhatsApp

O **Finari** é um bot pessoal de organização financeira que roda direto no seu computador usando o WhatsApp Web. Ele entende mensagens simples como \`150 mercado\` e registra suas receitas e despesas automaticamente.

> 📲 Simples, rápido e sem complicações — direto no seu WhatsApp.

---

## ✨ Funcionalidades

- ✅ **Registrar receitas e despesas** com mensagens simples  
- ✅ **Identificadores únicos** para cada transação  
- ✅ **Exibir extratos e resumos** personalizados  
- ✅ **Consulta de gastos** por categoria e por mês  
- ✅ **Excluir transações** com um comando simples  
- ✅ **por enquanto 100% local**, usando **WhatsApp Web** (número pessoal)

---

## 🧰 Tecnologias utilizadas

- [Node.js](https://nodejs.org/)
- [whatsapp-web.js](https://wwebjs.dev/)
- JavaScript

---

## 🚀 Como usar

1. Clone o repositório:

```bash
git clone https://github.com/xpedrotx/FinariBot.git
cd FinariBot
```

2. Instale as dependências:

```bash
npm install
```

3. Rode o bot:

```bash
node index.js
```

4. Escaneie o QR Code com seu WhatsApp (a sessão será salva localmente e reutilizada nas próximas vezes).

---

## 📷 Exemplo de uso

```
Gastei 150 no mercado
```  

```
Transação Registrada com Sucesso!

Identificador: EY026

📋 Resumo da Transação: ─────────────────────── 🔖 Descrição: Salário
💸 Valor: R$ 2500.00
🔄 Tipo: 🟩 Receita
🔖 Categoria: Renda
🏦 Conta: Não Informado
🗓️ Data: 06/04/2025

💵 Pago: ✅

❌ Quer excluir essa transação? Basta digitar: "Excluir transação EY026"

```

---

## 📌 Observações

- O bot roda **localmente** no seu computador.
- Nenhum dado é enviado para a nuvem.
- Você pode adaptar o código para integrar com bancos de dados como Supabase futuramente.

---

## 🧑‍💻 Autor

Feito por [@xpedrotx](https://github.com/xpedrotx)

---
