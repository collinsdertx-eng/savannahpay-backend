const express = require('express')
const admin = require('firebase-admin')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "savannahpay-e6486"
})

const db = admin.firestore()

app.post('/api/users/register', async (req, res) => {
    try {
        const { address, network } = req.body
        if (!address) return res.status(400).json({ error: 'Address required' })
        const userRef = db.collection('users').doc(address.toLowerCase())
        const userDoc = await userRef.get()
        if (userDoc.exists) {
            await userRef.update({ lastSeen: new Date(), network })
            return res.json({ success: true, user: userDoc.data(), isNew: false })
        }
        const newUser = {
            address: address.toLowerCase(),
            network: network || 'testnet',
            createdAt: new Date(),
            lastSeen: new Date(),
            totalTransactions: 0
        }
        await userRef.set(newUser)
        return res.json({ success: true, user: newUser, isNew: true })
    } catch(e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/api/admin/users', async (req, res) => {
    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get()
        const users = []
        snapshot.forEach(doc => users.push(doc.data()))
        res.json({ success: true, count: users.length, users })
    } catch(e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/api/transactions', async (req, res) => {
    try {
        const { address, type, amount, symbol, hash, network } = req.body
        if (!address || !hash) return res.status(400).json({ error: 'Missing fields' })
        const tx = { address: address.toLowerCase(), type, amount, symbol, hash, network, createdAt: new Date() }
        await db.collection('transactions').add(tx)
        const userRef = db.collection('users').doc(address.toLowerCase())
        await userRef.update({ totalTransactions: admin.firestore.FieldValue.increment(1) })
        res.json({ success: true, transaction: tx })
    } catch(e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/api/admin/transactions', async (req, res) => {
    try {
        const snapshot = await db.collection('transactions').orderBy('createdAt', 'desc').get()
        const txs = []
        snapshot.forEach(doc => txs.push(doc.data()))
        res.json({ success: true, count: txs.length, transactions: txs })
    } catch(e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/', (req, res) => {
    res.json({ message: '🦁 SavannahPay Backend Running!' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
})