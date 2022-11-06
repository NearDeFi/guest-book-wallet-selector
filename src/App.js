import 'regenerator-runtime/runtime';
import React, { useState, useEffect, useRef } from 'react';
import Big from 'big.js';
import Form from './components/Form';
import SignIn from './components/SignIn';
import Messages from './components/Messages';
import getConfig from './config.js';
import { getSelector, getAccount, viewFunction, functionCall } from './utils/wallet-selector/wallet-selector-compat.ts';

import * as nearAPI from 'near-api-js'
const {
	Transaction,
	utils: { format: {
		parseNearAmount
	}}
} = nearAPI
const networkIdUrlParam = window.location.search.split('?network=')[1]
const config = getConfig(networkIdUrlParam || 'mainnet');
const { networkId, contractName } = config
const SUGGESTED_DONATION = '0';
const BOATLOAD_OF_GAS = Big(3).times(10 ** 13).toFixed();

const test = Date.now()

const App = () => {
	const selectorRef = useRef();
	const [selector, setSelector] = useState(null);
	const [currentUser, setCurrentUser] = useState(null);
	const [messages, setMessages] = useState([]);

	const onMount = async () => {
		if (selector) return;
		const _selector = await getSelector({
			networkId,
			contractId: contractName,
			onAccountChange: async (accountId) => {
				console.log('account changed', accountId)
				if (accountId) {
					setCurrentUser({
						accountId,
						balance: (await (await getAccount()).getAccountBalance()).available
					})
				}
			}
		});

		selectorRef.current = _selector;
		setSelector(_selector)

		setMessages(await viewFunction({
			contractId: contractName,
			methodName: 'getMessages',
		}))
	};
	useEffect(() => {
		onMount();
	}, []);

	const onSubmit = async (e) => {
		e.preventDefault();

		const { fieldset, message, donation, multiple } = e.target.elements;
		fieldset.disabled = true;

		console.log(multiple.checked)

		if (multiple.checked) {
			const transactions = [];

			for (let i = 0; i < 2; i += 1) {
				transactions.push({
					receiverId: contractName,
					actions: [
						{
							type: "FunctionCall",
							params: {
								methodName: "addMessage",
								args: {
									text: `${message.value} (${i + 1}/2)`,
								},
								gas: BOATLOAD_OF_GAS,
								deposit: parseNearAmount(donation.value),
							},
						},
					],
				});
			}

			const wallet = await selector.wallet();
			return wallet.signAndSendTransactions({ transactions }).catch((err) => {
				alert("Failed to add messages exception " + err);
				console.log("Failed to add messages");
				throw err;
			});
		}

		const res = await functionCall({
			contractId: contractName,
			methodName: 'addMessage',
			args: { text: message.value },
			gas: BOATLOAD_OF_GAS,
			attachedDeposit: parseNearAmount(donation.value)
		})
		// would be redirect for NEAR Wallet IF donation > 0
		console.log(res)
		message.value = '';
		donation.value = SUGGESTED_DONATION;
		fieldset.disabled = false;
		message.focus();
		setMessages(await viewFunction({
			contractId: contractName,
			methodName: 'getMessages',
		}))
	};

	const signIn = () => {
		selector.signIn();
	};

	const signOut = async () => {
		selector.signOut()
	};

	const nethURL = `https://neardefi.github.io/neth/${networkId === 'testnet' ? '?network=testnet' : ''}`

	return (
		<main>
			<header>
				<h2>NETH Support - Network: {networkId}</h2>
				<p>Switch to <a
					href={networkId === 'mainnet' ? window.location.href + '?network=testnet' : window.location.href.split('?')[0]}
					onClick={() => localStorage.clear()}
				>
					{networkId === 'mainnet' ? 'testnet' : 'mainnet'} by clicking here
				</a>.</p>
				<p>This example app uses <a href={nethURL} target="_blank">NETH accounts</a>. You can sign in with MyNearWallet or use your <a href={nethURL} target="_blank">NETH Account</a>. If you don't have a <a href={nethURL} target="_blank">NETH account</a>, you can set one up <a href={nethURL} target="_blank">here</a>.</p>
				<p>Interested in adding NETH support to your app? <a href={nethURL} target="_blank">Click here</a>.</p>

				<h2>Guest Book</h2>
				{currentUser
					? <button onClick={signOut}>Log out</button>
					: selector && <button onClick={signIn}>Log in</button>
				}
			</header>
			{currentUser
				? <Form onSubmit={onSubmit} currentUser={currentUser} />
				: <SignIn />
			}
			{!!currentUser && !!messages.length && <Messages messages={messages} />}
		</main>
	);
};

export default App;
