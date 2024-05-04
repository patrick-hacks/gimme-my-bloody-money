import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { IDKitWidget } from '@worldcoin/idkit';
import Feedback from './Feedback';
import { chains, Network } from './chains';
// import { chains } from './chains'; // Assumed type for chain

interface PaymentReceiverProps {
  account: string;
  setAccount: (account: string) => void;
}

interface PaymentDetails {
  wallet: string | null;
  chainId: string | null;
  currency: string | null;
  amount: string | null;
}

const query = new URLSearchParams(window.location.search);

const params = {
  wallet: query.get('wallet'),
  chainId: query.get('chain-id'),
  currency: query.get('currency'),
  amount: query.get('amount'),
};

console.log(params);

// const handleOpenModal = () => {
//   const updatedSignal = "0xNEW_UPDATED_SIGNAL_HASH"; // Example to update the signal
//   Feedback.
//   setSignal(updatedSignal);
//   setIsModalOpen(true);
// };

const onSuccess = (result: any) => {
  console.log("Proof received from IDKit:\n", JSON.stringify(result));
  // const unpackedProof = decodeAbiParameters([{ type: 'uint256[8]' }], result.proof)[0]
  // console.log(unpackedProof)
  // console.log(result)
  // This is where you should perform frontend actions once a user has been verified, such as redirecting to a new page
  window.alert("Successfully verified with World ID! Your nullifier hash is: " + result.nullifier_hash);
};

function getPropertyValue<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const PaymentReceiver: React.FC<PaymentReceiverProps> = ({ account, setAccount }) => {
  const [error, setError] = useState<string>('');

  const foundChain = chains.find(chain => chain.chainId === Number(params.chainId))!;

  const handlePay = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask to proceed with the payment.');
      return;
    }
    if (window.ethereum.networkVersion !== params.chainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: params.chainId }]
        });
      } catch (error: any) {
        setError(`Error switching network: ${error.message}`);
        return;
      }
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      if (params.currency === 'ETH') {
        const transaction = {
          to: params.wallet!,
          value: ethers.parseEther(params.amount!),
          chainId: parseInt(params.chainId!)
        };
        const txResponse = await signer.sendTransaction(transaction);
        console.log('Transaction sent:', txResponse);
      } else {
        // assume erc20
        console.log(params.chainId)
        console.log(Number(params.chainId))
        const foundChain = chains.find(chain => chain.chainId === Number(params.chainId))!;
        const currency = params.currency as keyof Network
        const tokenAddress = foundChain[currency] as string;
        console.log(tokenAddress)
        const tokenABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function transfer(address to, uint amount) returns (bool)"
        ];
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);
        try {
            const transaction = await tokenContract.transfer(params.wallet, params.amount);
            console.log('Transaction hash:', transaction.hash);
            const receipt = await transaction.wait();
            console.log('Transaction confirmed in block:', receipt.blockNumber);
        } catch (error) {
            console.error('Transfer failed:', error);
        }
      }
    } catch (err: any) {
      console.error("Error while sending transaction:", err);
      setError(`Payment failed: ${err.message}`);
    }
      // TODO check currency
  };


  return (
    <div>
      <h1>Payment Details</h1>
      <p>Wallet Address: {params.wallet}</p>
      <p>Network: {foundChain.name}</p>
      <p>Currenct: {params.currency}</p>
      <p>Amount: {params.amount} </p>
      <button className="button" onClick={handlePay}>Pay</button>
      <Feedback></Feedback>
      <IDKitWidget
          app_id="app_staging_51c06a1df3fa4b5f004db3fb8dfe6569"
          action="test"
          signal="0x1"
          // On-chain only accepts Orb verifications
          // verification_level={VerificationLevel.Orb}
          // handleVerify={handleProof}
          onSuccess={onSuccess}>
          {({ open }) => (
            <button
              onClick={open}
            >
              Mark as spam
            </button>
          )}
      </IDKitWidget>
      <IDKitWidget
          app_id="app_staging_51c06a1df3fa4b5f004db3fb8dfe6569"
          action="test"
          signal="0x0"
          // On-chain only accepts Orb verifications
          // verification_level={VerificationLevel.Orb}
          // handleVerify={handleProof}
          onSuccess={onSuccess}>
          {({ open }) => (
            <button
              onClick={open}
            >
              Mark as valid
            </button>
          )}
      </IDKitWidget>
      {/* <button onClick={feedbackSpam}>Mark as spam</button>
      <button onClick={feedbackLegit}>Mark as legit</button> */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default PaymentReceiver;
