// libs
const ABICoder = require('aion-web3-avm-abi')
const BigNumber = require('bignumber.js')
const { AionKeystoreClient, AionLocalSigner }  = require( '@makkii/app-aion')
const WebSocketClient = require('websocket').client;

const client = new WebSocketClient()

let send = null
let nonce = 0
let names = ['identity_address', 'signing_address', 'coinbase_address', 'value', 'private_key']
let params = new Array(5).fill(0)
let i = 0

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString())
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed')
    });
    connection.on('message', function(message) {
        const data = JSON.parse(message.utf8Data)
        if (message.type === 'utf8') {
            // console.log("Received msg:", JSON.parse( message.utf8Data))
            const data = JSON.parse(message.utf8Data)
            if(data.method === 'eth_getTransactionCount') {
                nonce = data.result
                console.log('')
                console.log('')
                console.log('')
                console.log('get nonce:', nonce)
                register_staker(...params)
                    .then(res => {
                        console.log('====================================================================')
                        console.log('get result:', res)
                        send({'method': 'eth_sendRawTransaction', 'params': [res]})
                    })
                    .catch(err => console.log('err occur:', err))
                    .finally(() => {
                        // process.exit(0)
                    })

            }else if(data.method === 'eth_sendRawTransaction') {
                console.log('')
                console.log('')
                console.log('')
                console.log('transaction success, tx hash:', data.result)
                process.exit(0)
            }
        }
    });

    send = function(obj) {
        if (connection.connected) {
            connection.sendUTF(JSON.stringify(obj))
        }
    }
    getInput(names)
})


client.connect('ws://45.118.132.89/ws')


const build_transaction =  function (nonce, from, to, gasPrice, gasLimit, data, amount) {
    return {
        nonce,
        from,
        to,
        value: amount || 0,
        timestamp: new Date().getTime() * 1000,
        type: 1,
        gasPrice,
        gasLimit,
        data
    }
}


// init
const abi = new ABICoder()
const BN_GAS_PRICE = new BigNumber('10000000000')
const BN_GAS_USAGE_DELEGATE = new BigNumber('2000000')
const BN_AION = new BigNumber('1000000000000000000')
const keystore_client = new AionKeystoreClient();

const register_staker =  function(identity_address, signing_address, coinbase_address, value, private_key) {
    return new Promise((resolve, reject) => {
        const data = abi.encodeMethod(
            'registerStaker',
            ['Address', 'Address', 'Address',],
            [identity_address, signing_address, coinbase_address])
        const tx = build_transaction(
            nonce,
            signing_address,
            '0xa0733306c2ee0c60224b0e59efeae8eee558c0ca1b39e7e5a14a575124549416',
            BN_GAS_PRICE.toFixed(),
            BN_GAS_USAGE_DELEGATE.toFixed(),
            data,
            new BigNumber(value).toFixed()
        )
        keystore_client.signTransaction(tx, new AionLocalSigner(),{private_key})
            .then(
                signed => resolve(signed),
                err => reject('err occur:', err)
            )
    })
}

process.stdout.write("this will generate an encoded data with private key for you:")
console.log('')
console.log('')
console.log('')

process.stdin.on('data',(input)=>{
    const value = input.toString().trim()
    console.log('get input:', value)
    params[i] = value
    console.log('------------------------------------------------')
    ++i
    getInput(names)
})

function getInput(arr) {
    if(i >= arr.length) {
        return send({ method: 'eth_getTransactionCount', params: [params[1]] })
    }
    process.stdout.write(`${names[i]}:`)
}
