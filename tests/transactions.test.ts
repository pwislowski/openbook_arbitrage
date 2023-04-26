/* 
Test Transactions Module using Solana devnet
*/

import { Connection, clusterApiUrl } from "@solana/web3.js"

// env vars
const conn = new Connection(clusterApiUrl('devnet'))

describe(
    'Hello World', () => {
        test('Hello world', () => {
            expect(
                'Hello world'
            ).toBe('Hello world')
        })
    }
)