const {
	default: makeWASocket,
	useSingleFileAuthState,
	DisconnectReason,
	getContentType,
    jidDecode
} = require('@adiwajshing/baileys')

const fs = require('fs')
const P = require('pino')
const qrcode = require('qrcode-terminal')
const util = require('util')
const config = require('./config')
const { state, saveState } = useSingleFileAuthState('./session.json')

const prefix = '.'
const owner = ['94712448370']

const connectToWA = () => {
	const PeaceMD = makeWASocket({
		logger: P({ level: 'silent' }),
		printQRInTerminal: true,
		auth: state,
	})
	
	PeaceMD.ev.on('connection.update', (update) => {
		const { connection, lastDisconnect } = update
		if (connection === 'close') {
			if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
				connectToWA()
			}
		} else if (connection === 'open') {
			console.log('Bot conected')
		}
	})
	
	PeaceMD.ev.on('creds.update', saveState)


	PeaceMD.ev.on('messages.upsert', async(mek) => {
		try {
			mek = mek.messages[0]
			if (!mek.message) return
			
			mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
			if (mek.key && mek.key.remoteJid === 'status@broadcast') return
			const type = getContentType(mek.message)
			const content = JSON.stringify(mek.message)
			const from = mek.key.remoteJid
			
			const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []
			const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : ( type == 'listResponseMessage') && mek.message.listResponseMessage.singleSelectReply.selectedRowId? mek.message.listResponseMessage.singleSelectReply.selectedRowId : (type == 'buttonsResponseMessage') && mek.message.buttonsResponseMessage.selectedButtonId  ? mek.message.buttonsResponseMessage.selectedButtonId  : (type == "templateButtonReplyMessage") && mek.message.templateButtonReplyMessage.selectedId ? mek.message.templateButtonReplyMessage.selectedId  :  (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''
			
			const isCmd = body.startsWith(prefix)
			const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
			
			const args = body.trim().split(/ +/).slice(1)
			const q = args.join(' ')
			const isGroup = from.endsWith('@g.us')
			const sender = mek.key.fromMe ? (PeaceMD.user.id.split(':')[0]+'@s.whatsapp.net' || PeaceMD.user.id) : (mek.key.participant || mek.key.remoteJid)
			const senderNumber = sender.split('@')[0]
			const botNumber = PeaceMD.user.id.split(':')[0]
			const pushname = mek.pushName || 'Sin Nombre'
			
			
			const isMe = botNumber.includes(senderNumber)
			const isOwner = owner.includes(senderNumber) || isMe
			
			const reply = (teks) => {
				PeaceMD.sendMessage(from, { text: teks }, { quoted: mek })
			}
            const groupMetadata = mek.isGroup ? await PeaceMD.groupMetadata(mek.chat).catch(e => {}) : ''
            const groupName = mek.isGroup ? groupMetadata.subject : ''
            const participants = mek.isGroup ? await groupMetadata.participants : ''
            const groupAdmins = mek.isGroup ? await participants.filter(v => v.admin !== null).map(v => v.id) : ''
            const groupOwner = mek.isGroup ? groupMetadata.owner : ''
    	    const isBotAdmins = mek.isGroup ? groupAdmins.includes(botNumber) : false
    	    const isAdmins = mek.isGroup ? groupAdmins.includes(mek.sender) : false

                
			if (!isGroup && !isOwner) {
               return reply ('Inbox Not Allowed')
                
            }

			switch (command) {



//.....................................................................................................................\\
				
				case 'alive': {
				await PeaceMD.sendMessage(from, { react: {  text: "👋", key: mek.key } } )
				let alivemsg = `✌️ PEACE ${pushname} 
				
				I Am Alive Now
				
				`
				let buttons = [
				{buttonId: prefix + 'owner ', buttonText: {displayText: 'OWNER'}, type: 1},
				{buttonId: prefix + 'menu ', buttonText: {displayText: 'MENU'}, type: 1},
				{buttonId: prefix + 'runtime ', buttonText: {displayText: 'RUN TIME'}, type: 1}
				]
				let buttonMessage = {
				image: {url: config.ALIVE_LOGO},
				caption: alivemsg,
				footer: config.FOOTER,
				buttons: buttons,
				headerType: 4,
				}
				PeaceMD.sendMessage(from, buttonMessage, { quoted: mek })
				}
				break
				
				
				
				
						   
				
					 
								default:
									
									if (isOwner && body.startsWith('>')) {
										try {
											await reply(util.format(await eval(`(async () => {${body.slice(1)}})()`)))
										} catch(e) {
											await reply(util.format(e))
										}
									}
									
							} 
 
  
        
			
			
		} catch (e) {
			const isError = String(e)
			
			console.log(isError)
		}
	})
}

connectToWA()
