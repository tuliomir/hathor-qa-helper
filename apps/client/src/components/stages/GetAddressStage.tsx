/**
 * Get Address Stage
 *
 * Tests htr_getAddress and checks the returned address against the test
 * wallet's own derivation.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  clearGetAddressData,
  setGetAddressError,
  setGetAddressRequest,
  setGetAddressResponse,
  setIndexValue,
  setRequestType,
  setValidationStatus,
} from '../../store/slices/getAddressSlice';
import { RpcGetAddressCard } from '../rpc/RpcGetAddressCard';
import { buildGetAddressRequest } from '../../utils/rpcCoreRequests';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Identifier } from '../common/Identifier';
import { Callout } from '../ui/Callout';
import { useRequireRpcSession } from '../../hooks/useRequirements';
import { toMethodData, useRpcStageCall } from '../../hooks/useRpcStageCall';
import { useWalletStore } from '../../hooks/useWalletStore';
import { firstUnmetReason } from '../../utils/requirements';
import { isAddressOnly } from '../../utils/addressOnlyWallet';

const GET_ADDRESS_ACTIONS = {
  setRequest: setGetAddressRequest,
  setResponse: setGetAddressResponse,
  setError: setGetAddressError,
};

export const GetAddressStage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { getWallet } = useWalletStore();
  const rpcSession = useRequireRpcSession();
  const { isDryRun, execute } = useRpcStageCall(GET_ADDRESS_ACTIONS);

  const getAddressData = useSelector((state: RootState) => state.getAddress);
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const testWallet = testWalletId ? getWallet(testWalletId) : null;
  const { requestType, indexValue, response, validationStatus, localAddress } = getAddressData;

  const handleExecute = () => {
    dispatch(clearGetAddressData());
    const index = requestType === 'index' ? indexValue : undefined;
    return execute((h) => h.getRpcGetAddress(requestType, index), buildGetAddressRequest(requestType, indexValue));
  };

  // An address-only test wallet can only be checked at index 0, against its saved address.
  const addressOnly = testWallet ? isAddressOnly(testWallet.metadata) : false;
  const savedAddress0 = addressOnly ? (testWallet?.metadata.address0 ?? null) : null;

  // Check the RPC address against the test wallet's derivation at the same index.
  useEffect(() => {
    const validateAddress = async () => {
      if (!response || getAddressData.isDryRun) return;
      if (validationStatus === 'validating' || validationStatus === 'match' || validationStatus === 'mismatch') return;
      if (addressOnly) {
        if (response.index !== 0 || !savedAddress0) return;
        const status = savedAddress0 === response.address ? 'match' : 'mismatch';
        dispatch(setValidationStatus({ status, localAddress: savedAddress0 }));
        return;
      }
      if (!testWallet?.instance) return;
      try {
        dispatch(setValidationStatus({ status: 'validating' }));
        const derived = await testWallet.instance.getAddressAtIndex(response.index);
        dispatch(
          setValidationStatus({ status: derived === response.address ? 'match' : 'mismatch', localAddress: derived })
        );
      } catch (error) {
        console.error('Failed to validate address:', error);
        dispatch(setValidationStatus({ status: 'mismatch' }));
      }
    };
    validateAddress();
  }, [response, validationStatus, getAddressData.isDryRun, testWallet?.instance, addressOnly, savedAddress0, dispatch]);

  const validation = response && !getAddressData.isDryRun && (
    <div className="flex flex-col gap-2 border-t border-base-300 pt-4">
      <h3 className="m-0 text-title-sm">Address check</h3>
      {!testWallet && (
        <Callout tone="warning" title="No test wallet to check against">
          Start a test wallet to compare the address with the one it derives locally.
        </Callout>
      )}
      {addressOnly && response.index !== 0 && (
        <Callout tone="info" title="Can't check this index">
          The test wallet is address-only, so only address 0 can be compared.
        </Callout>
      )}
      {validationStatus === 'validating' && (
        <p className="m-0 flex items-center gap-2 text-body text-ink-muted">
          <span className="loading loading-spinner loading-xs" aria-hidden="true" />
          Deriving the test wallet address at index {response.index}…
        </p>
      )}
      {validationStatus === 'match' && (
        <Callout tone="success" title="Matches the test wallet">
          The test wallet derives the same address at index {response.index}.
        </Callout>
      )}
      {validationStatus === 'mismatch' && (
        <Callout tone="error" title="Differs from the test wallet">
          <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1">
            <dt>RPC address</dt>
            <dd className="m-0 min-w-0">
              <Identifier value={response.address} kind="address" walletTag={false} />
            </dd>
            {localAddress && (
              <>
                <dt>Test wallet, index {response.index}</dt>
                <dd className="m-0 min-w-0">
                  <Identifier value={localAddress} kind="address" walletTag={false} />
                </dd>
              </>
            )}
          </dl>
        </Callout>
      )}
    </div>
  );

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="rpc-get-address"
        description="Ask the wallet for an address by type: first empty, by index, or the wallet's choice."
        method="htr_getAddress"
      />
      <PreconditionStrip requirements={[rpcSession]} />
      <RpcGetAddressCard
        onExecute={handleExecute}
        methodData={toMethodData(getAddressData)}
        isDryRun={isDryRun}
        disabledReason={firstUnmetReason([rpcSession])}
        requestType={requestType}
        indexValue={indexValue}
        onRequestTypeChange={(type) => dispatch(setRequestType(type))}
        onIndexValueChange={(index) => dispatch(setIndexValue(index))}
        inspectExtra={validation}
      />
    </div>
  );
};
