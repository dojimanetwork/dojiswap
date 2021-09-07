import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react'
// import { TokenAmount } from 'anyswap-sdk'
// import { createBrowserHistory } from 'history'
import { useTranslation } from 'react-i18next'
import styled, { ThemeContext } from 'styled-components'
import { ArrowDown, Plus, Minus } from 'react-feather'

import SelectChainIdInputPanel from './selectChainIDSwap'
// import Reminder from './reminder'
import SwapJson from '../../constants/abis/dojima/swap.json'
import { useSnackbar } from 'notistack'
import { useActiveWeb3React } from '../../hooks'
import { useBridgeCallback, useBridgeUnderlyingCallback, useBridgeNativeCallback } from '../../hooks/useBridgeCallback'
import { WrapType } from '../../hooks/useWrapCallback'
import { useApproveCallback, ApprovalState } from '../../hooks/useApproveCallback'
import { useLocalToken } from '../../hooks/Tokens'
import Web3 from 'web3'
import SelectCurrencyInputPanel from '../../components/CurrencySelect/selectCurrencySwap'
import { AutoColumn } from '../../components/Column'
import { ButtonLight, ButtonPrimary, ButtonConfirmed } from '../../components/Button'
import { AutoRow } from '../../components/Row'
import Loader from '../../components/Loader'
import AddressInputPanel from '../../components/AddressInputPanel'
import { ArrowWrapper, BottomGrouping } from '../../components/swap/styleds'
import Title from '../../components/Title'
import ModalContent from '../../components/Modal/ModalContent'
import { AbiItem } from 'web3-utils'
// import { useWalletModalToggle, useToggleNetworkModal } from '../../state/application/hooks'
import { useWalletModalToggle } from '../../state/application/hooks'
import { tryParseAmount } from '../../state/swap/hooks'
import { useBridgeTokenList } from '../../state/lists/hooks'
import { useBridgeAllTokenBalances } from '../../state/wallet/hooks'

import config from '../../config'
import { getParams } from '../../config/tools/getUrlParams'
import { selectNetwork } from '../../config/tools/methods'

import { getNodeTotalsupply } from '../../utils/bridge/getBalance'
import { formatDecimal, thousandBit } from '../../utils/tools/tools'
import { isAddress } from '../../utils'

import AppBody from '../AppBody'
import TokenLogo from '../../components/TokenLogo'

const LiquidityView = styled.div`
  ${({ theme }) => theme.flexSC};
  border: solid 0.5px ${({ theme }) => theme.tipBorder};
  background-color: ${({ theme }) => theme.tipBg};
  border-radius: 0.5625rem;
  padding: 8px 16px;
  color: ${({ theme }) => theme.tipColor};
  font-size: 12px;
  white-space: nowrap;
  .item {
    ${({ theme }) => theme.flexBC};
    margin-right: 10px;
    margin-left: 10px;
    .cont {
      margin-left: 10px;
      color: ${({ theme }) => theme.tipColor};
      font-size: 12px;
    }
  }
  ${({ theme }) => theme.mediaWidth.upToLarge`
    padding: 8px 12px;
  `};
`

const LogoBox = styled.div`
  ${({ theme }) => theme.flexC};
  width: 46px;
  height: 46px;
  object-fit: contain;
  box-shadow: 0 0.125rem 0.25rem 0 rgba(0, 0, 0, 0.04);
  border: solid 0.5px rgba(0, 0, 0, 0.1);
  border-radius: 100%;
  margin: auto;

  img {
    height: 24px;
    width: 24px;
    display: block;
  }
`
const ConfirmContent = styled.div`
  width: 100%;
`
const TxnsInfoText = styled.div`
  font-family: 'Manrope';
  font-size: 22px;
  text-align: center;
  color: ${({ theme }) => theme.textColorBold};
  margin-top: 1rem;
`
const ConfirmText = styled.div`
  width: 100%;
  font-family: 'Manrope';
  font-size: 0.75rem;
  font-weight: bold;
  text-align: center;
  color: #734be2;
  padding: 1.25rem 0;
  border-top: 0.0625rem solid rgba(0, 0, 0, 0.08);
  margin-top: 1.25rem;
`

const FlexEC = styled.div`
  ${({ theme }) => theme.flexEC};
`

let intervalFN: any = ''

const BRIDGETYPE = 'routerTokenList'

export default function CrossChain() {
  // const { account, chainId, library } = useActiveWeb3React()
  const { account, chainId } = useActiveWeb3React()
  const { t } = useTranslation()
  const allTokensList: any = useBridgeTokenList(BRIDGETYPE, chainId)
  // const toggleNetworkModal = useToggleNetworkModal()
  // const history = createBrowserHistory()
  const allBalances = useBridgeAllTokenBalances(BRIDGETYPE, chainId)
  const theme = useContext(ThemeContext)
  const toggleWalletModal = useWalletModalToggle()

  const [inputBridgeValue, setInputBridgeValue] = useState('')
  const [selectCurrency, setSelectCurrency] = useState<any>()
  const [selectChain, setSelectChain] = useState<any>()
  const [selectChainList, setSelectChainList] = useState<Array<any>>([])
  const [recipient, setRecipient] = useState<any>(account ?? '')
  const [swapType, setSwapType] = useState('swap')
  // const [count, setCount] = useState<number>(0)
  const [intervalCount, setIntervalCount] = useState<number>(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalTipOpen, setModalTipOpen] = useState(false)

  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)

  const [delayAction, setDelayAction] = useState<boolean>(false)

  // const [allTokens, setAllTokens] = useState<any>({})

  const [curChain, setCurChain] = useState<any>({
    chain: chainId,
    ts: '',
    bl: ''
  })
  const [destChain, setDestChain] = useState<any>({
    chain: config.getCurChainInfo(chainId).bridgeInitChain,
    ts: '',
    bl: ''
  })

  let initBridgeToken: any = getParams('bridgetoken') ? getParams('bridgetoken') : ''
  initBridgeToken = initBridgeToken ? initBridgeToken.toLowerCase() : ''
  // console.log(selectCurrency)

  const destConfig = useMemo(() => {
    if (selectCurrency && selectCurrency?.destChains && selectCurrency?.destChains[selectChain]) {
      return selectCurrency?.destChains[selectChain]
    }
    return false
  }, [selectCurrency, selectChain])

  // console.log(destConfig)
  // console.log(bridgeConfig)

  const isNativeToken = useMemo(() => {
    if (
      selectCurrency &&
      selectCurrency.address &&
      chainId &&
      config.getCurChainInfo(chainId) &&
      config.getCurChainInfo(chainId).nativeToken &&
      config.getCurChainInfo(chainId).nativeToken.toLowerCase() === selectCurrency.address.toLowerCase()
    ) {
      return true
    }
    return false
  }, [selectCurrency, chainId])

  const isUnderlying = useMemo(() => {
    if (selectCurrency && selectCurrency?.underlying) {
      return true
    }
    return false
  }, [selectCurrency, selectChain])

  const isDestUnderlying = useMemo(() => {
    if (
      selectCurrency &&
      selectCurrency?.destChains &&
      selectCurrency?.destChains[selectChain] &&
      selectCurrency?.destChains[selectChain]?.underlying
    ) {
      return true
    }
    return false
  }, [selectCurrency, selectChain])

  const formatCurrency = useLocalToken(selectCurrency)
  // const formatInputBridgeValue = inputBridgeValue && Number(inputBridgeValue) ? tryParseAmount(inputBridgeValue, formatCurrency ?? undefined) : ''
  const formatInputBridgeValue = tryParseAmount(inputBridgeValue, formatCurrency ?? undefined)
  const [approval, approveCallback] = useApproveCallback(
    formatInputBridgeValue ?? undefined,
    selectCurrency?.routerToken
  )

  useEffect(() => {
    if (approval === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [approval, approvalSubmitted])

  // console.log(selectCurrency)

  function onDelay() {
    setDelayAction(true)
  }
  function onClear() {
    setDelayAction(false)
    setModalTipOpen(false)
    setInputBridgeValue('')
  }

  function changeNetwork(chainID: any) {
    selectNetwork(chainID).then((res: any) => {
      console.log(res)
      if (res.msg === 'Error') {
        alert(t('changeMetamaskNetwork', { label: config.getCurChainInfo(chainID).networkName }))
      }
    })
  }

  useEffect(() => {
    setDestChain('')
  }, [selectChain, selectCurrency])

  const getSelectPool = useCallback(async () => {
    if (selectCurrency && chainId) {
      const CC: any = await getNodeTotalsupply(
        selectCurrency?.underlying?.address,
        chainId,
        selectCurrency?.decimals,
        account,
        selectCurrency?.address
      )
      // console.log(CC)
      // console.log(selectCurrency)
      if (CC) {
        setCurChain({
          chain: chainId,
          ts: selectCurrency?.underlying
            ? CC[selectCurrency?.underlying?.address]?.ts
            : CC[selectCurrency?.address]?.anyts,
          bl: CC[selectCurrency?.address]?.balance
        })
      }
      const DC: any = await getNodeTotalsupply(
        selectCurrency?.destChains[selectChain]?.underlying?.address,
        selectChain,
        selectCurrency?.destChains[selectChain]?.decimals,
        account,
        selectCurrency?.destChains[selectChain]?.address
      )
      if (DC) {
        setDestChain({
          chain: selectChain,
          ts: selectCurrency?.underlying
            ? DC[selectCurrency?.destChains[selectChain]?.underlying.address]?.ts
            : DC[selectCurrency?.destChains[selectChain].token]?.anyts,
          bl: DC[selectCurrency?.destChains[selectChain].address]?.balance
        })
      }
      // console.log(CC)
      // console.log(DC)
      if (intervalFN) clearTimeout(intervalFN)
      intervalFN = setTimeout(() => {
        setIntervalCount(intervalCount + 1)
      }, 1000 * 10)
    }
  }, [selectCurrency, chainId, account, selectChain, intervalCount])

  useEffect(() => {
    getSelectPool()
  }, [getSelectPool])

  const { wrapType, execute: onWrap, inputError: wrapInputError } = useBridgeCallback(
    selectCurrency?.routerToken,
    formatCurrency ? formatCurrency : undefined,
    isUnderlying ? selectCurrency?.underlying?.address : selectCurrency?.address,
    recipient,
    inputBridgeValue,
    selectChain
  )

  const { wrapType: wrapTypeNative, execute: onWrapNative, inputError: wrapInputErrorNative } = useBridgeNativeCallback(
    selectCurrency?.routerToken,
    formatCurrency ? formatCurrency : undefined,
    isUnderlying ? selectCurrency?.underlying?.address : selectCurrency?.address,
    recipient,
    inputBridgeValue,
    selectChain
  )

  const {
    wrapType: wrapTypeUnderlying,
    execute: onWrapUnderlying,
    inputError: wrapInputErrorUnderlying
  } = useBridgeUnderlyingCallback(
    selectCurrency?.routerToken,
    formatCurrency ? formatCurrency : undefined,
    isUnderlying ? selectCurrency?.underlying?.address : selectCurrency?.address,
    recipient,
    inputBridgeValue,
    selectChain
  )

  const outputBridgeValue = useMemo(() => {
    if (inputBridgeValue && destConfig) {
      const fee = (Number(inputBridgeValue) * Number(destConfig.SwapFeeRatePerMillion)) / 100
      let value = Number(inputBridgeValue) - fee
      if (fee < Number(destConfig.MinimumSwapFee)) {
        value = Number(inputBridgeValue) - Number(destConfig.MinimumSwapFee)
      } else if (fee > destConfig.MaximumSwapFee) {
        value = Number(inputBridgeValue) - Number(destConfig.MaximumSwapFee)
      }
      if (!destConfig?.swapfeeon) {
        value = Number(inputBridgeValue)
      }
      if (value && Number(value) && Number(value) > 0) {
        // return formatDecimal(value, Math.min(6, selectCurrency.decimals))
        return thousandBit(formatDecimal(value, Math.min(6, selectCurrency.decimals)), 'no')
      }
      return ''
    } else {
      return ''
    }
  }, [inputBridgeValue, destConfig, selectChain])

  const isWrapInputError = useMemo(() => {
    if (!isUnderlying && !isNativeToken) {
      if (wrapInputError) {
        return wrapInputError
      } else {
        return false
      }
    } else {
      if (isUnderlying && !isNativeToken) {
        if (wrapInputErrorUnderlying) {
          return wrapInputErrorUnderlying
        } else {
          return false
        }
      } else if (isUnderlying && isNativeToken) {
        if (wrapInputErrorNative) {
          return wrapInputErrorNative
        } else {
          return false
        }
      }
      return false
    }
  }, [isNativeToken, wrapInputError, wrapInputErrorUnderlying, wrapInputErrorNative, selectCurrency])

  const isCrossBridge = useMemo(() => {
    // console.log(!wrapInputErrorUnderlying && !isNativeToken)
    // console.log(destConfig)
    // console.log(destChain)
    if (
      account &&
      destConfig &&
      selectCurrency &&
      inputBridgeValue &&
      !isWrapInputError &&
      isAddress(recipient) &&
      ((isDestUnderlying && destChain) || (!isDestUnderlying && !destChain))
    ) {
      if (
        Number(inputBridgeValue) < Number(destConfig.MinimumSwap) ||
        Number(inputBridgeValue) > Number(destConfig.MaximumSwap) ||
        (isDestUnderlying && Number(inputBridgeValue) > Number(destChain.ts))
      ) {
        return true
      } else {
        return false
      }
    } else {
      return true
    }
  }, [selectCurrency, account, destConfig, inputBridgeValue, recipient, destChain, isWrapInputError])

  const isInputError = useMemo(() => {
    // console.log(destChain)
    if (account && destConfig && selectCurrency && inputBridgeValue && isCrossBridge) {
      if (
        Number(inputBridgeValue) < Number(destConfig.MinimumSwap) ||
        Number(inputBridgeValue) > Number(destConfig.MaximumSwap) ||
        (isDestUnderlying && Number(inputBridgeValue) > Number(destChain.ts))
      ) {
        return true
      } else {
        return false
      }
    } else {
      return false
    }
  }, [account, destConfig, selectCurrency, inputBridgeValue, isCrossBridge])

  const [] = useMemo(() => {
    // console.log(isWrapInputError)
    if (isWrapInputError && inputBridgeValue) {
      return isWrapInputError
    } else if (
      destConfig &&
      inputBridgeValue &&
      (Number(inputBridgeValue) < Number(destConfig.MinimumSwap) ||
        Number(inputBridgeValue) > Number(destConfig.MaximumSwap))
    ) {
      return t('ExceedLimit')
    } else if (isDestUnderlying && Number(inputBridgeValue) > Number(destChain.ts)) {
      return t('nodestlr')
    } else if (wrapType === WrapType.WRAP || wrapTypeNative === WrapType.WRAP || wrapTypeUnderlying === WrapType.WRAP) {
      return t('swap')
    }
    return t('swap')
  }, [
    t,
    isWrapInputError,
    inputBridgeValue,
    destConfig,
    destChain,
    wrapType,
    wrapTypeNative,
    wrapTypeUnderlying,
    isDestUnderlying
  ])

  useEffect(() => {
    const t =
      selectCurrency && selectCurrency.chainId?.toString() === chainId?.toString()
        ? selectCurrency.address
        : initBridgeToken
        ? initBridgeToken
        : config.getCurChainInfo(chainId).bridgeInitToken
    // setAllTokens({})
    // setSelectCurrency('')
    const list: any = {}
    for (const token in allTokensList) {
      if (!isAddress(token)) continue
      list[token] = {
        ...allTokensList[token].tokenInfo
      }
      // console.log(selectCurrency)
      if (!selectCurrency || selectCurrency.chainId?.toString() !== chainId?.toString()) {
        if (
          t === token ||
          list[token]?.symbol?.toLowerCase() === t ||
          list[token]?.underlying?.symbol?.toLowerCase() === t
        ) {
          setSelectCurrency(list[token])
        }
      }
    }
  }, [chainId, allTokensList])

  useEffect(() => {
    if (swapType == 'swap' && account) {
      setRecipient(account)
    }
  }, [account, swapType])

  useEffect(() => {
    // console.log(selectCurrency)
    if (selectCurrency) {
      const arr = []
      for (const c in selectCurrency?.destChains) {
        if (c?.toString() === chainId?.toString()) continue
        arr.push(c)
      }
      if (arr.length > 0) {
        for (const c of arr) {
          if (config.getCurConfigInfo()?.hiddenChain?.includes(c)) continue
          setSelectChain(c)
          break
        }
      } else {
        setSelectChain(config.getCurChainInfo(chainId).bridgeInitChain)
      }
      setSelectChainList(arr)
    }
  }, [selectCurrency])

  const handleMaxInput = useCallback(
    value => {
      if (value) {
        setInputBridgeValue(value)
      } else {
        setInputBridgeValue('')
      }
      // setSwapType('send')
    },
    [setInputBridgeValue]
  )
  // console.log(isUnderlying)
  // console.log(isDestUnderlying)

  const [loading, setLoading] = useState(false)
  const { enqueueSnackbar } = useSnackbar()

  function ButtonView(type: any) {
    return (
      <BottomGrouping>
        {loading ? (
          <ButtonConfirmed>
            <AutoRow gap="6px" justify="center">
              {t('Swapping')} <Loader stroke="white" />
            </AutoRow>
          </ButtonConfirmed>
        ) : (
          <ButtonPrimary
            onClick={async () => {
              try {
                setLoading(true)
                const web3 = new Web3('http://localhost:8545')
                const pstAddress = '0xE93fC5A1Fa282598807541865AB80d5d88D87674'
                const usdtAddress = '0x4B4c77f6C31D34F89d01ddB9B175913B2578b56e'
                const address = '0x01c1aC601CDFd1D0a11Faa3DcCcd78EFbD0669CC'
                //pst burn contract
                const contract = new web3.eth.Contract(
                  SwapJson as AbiItem[],
                  pstAddress
                )
                //burn tokens from addresss
                await contract.methods
                  .burnFrom(
                    address,
                    web3.utils.toWei(`${inputBridgeValue}`, 'ether')
                  )
                  .send({
                    from: address
                  })
                //load usdt contract
                const usdtContract = new web3.eth.Contract(
                  SwapJson as AbiItem[],
                  usdtAddress
                )
                //mint usdt tokens to address
                await usdtContract.methods.mint(address, web3.utils.toWei(`${outputBridgeValue}`, 'ether')).send({
                  from: address
                })
                enqueueSnackbar('Swap is successfully done', {
                  variant: 'success'
                })
                setLoading(false)
                setInputBridgeValue('0')
              } catch (err) {
                console.log(err)                
                setLoading(false)
                enqueueSnackbar('Something went wrong. Please try again.....', {
                  variant: 'error'
                })
              }
            }}
          >
            Swap
          </ButtonPrimary>
        )}
      </BottomGrouping>
    )
  }

  return (
    <>
      <ModalContent
        isOpen={modalTipOpen}
        title={'Cross-chain Router'}
        onDismiss={() => {
          setModalTipOpen(false)
        }}
      >
        <LogoBox>
          <TokenLogo symbol={selectCurrency?.symbol ?? selectCurrency?.symbol} size={'1rem'}></TokenLogo>
        </LogoBox>
        <ConfirmContent>
          <TxnsInfoText>
            {inputBridgeValue + ' ' + config.getBaseCoin(selectCurrency?.symbol ?? selectCurrency?.symbol, chainId)}
          </TxnsInfoText>
          {isUnderlying && isDestUnderlying ? (
            <ConfirmText>
              {t('swapTip', {
                symbol: config.getBaseCoin(selectCurrency?.underlying?.symbol, chainId),
                symbol1: config.getBaseCoin(selectCurrency?.symbol ?? selectCurrency?.symbol, chainId),
                chainName: config.getCurChainInfo(selectChain).name
              })}
            </ConfirmText>
          ) : (
            ''
          )}
          <BottomGrouping>
            {!account ? (
              <ButtonLight onClick={toggleWalletModal}>{t('ConnectWallet')}</ButtonLight>
            ) : !isNativeToken &&
              selectCurrency &&
              isUnderlying &&
              inputBridgeValue &&
              (approval === ApprovalState.NOT_APPROVED || approval === ApprovalState.PENDING) ? (
              <ButtonConfirmed
                onClick={() => {
                  onDelay()
                  approveCallback().then(() => {
                    onClear()
                  })
                }}
                disabled={approval !== ApprovalState.NOT_APPROVED || approvalSubmitted || delayAction}
                width="48%"
                altDisabledStyle={approval === ApprovalState.PENDING} // show solid button while waiting
                // confirmed={approval === ApprovalState.APPROVED}
              >
                {approval === ApprovalState.PENDING ? (
                  <AutoRow gap="6px" justify="center">
                    {t('Approving')} <Loader stroke="white" />
                  </AutoRow>
                ) : approvalSubmitted ? (
                  t('Approved')
                ) : (
                  t('Approve') + ' ' + config.getBaseCoin(selectCurrency?.symbol ?? selectCurrency?.symbol, chainId)
                )}
              </ButtonConfirmed>
            ) : (
              <ButtonPrimary
                disabled={isCrossBridge || delayAction}
                onClick={() => {
                  // <ButtonPrimary disabled={delayAction} onClick={() => {
                  onDelay()
                  if (!selectCurrency || !isUnderlying) {
                    if (onWrap)
                      onWrap().then(() => {
                        onClear()
                      })
                  } else {
                    // if (onWrapUnderlying) onWrapUnderlying()
                    if (isNativeToken) {
                      if (onWrapNative)
                        onWrapNative().then(() => {
                          onClear()
                        })
                    } else {
                      if (onWrapUnderlying)
                        onWrapUnderlying().then(() => {
                          onClear()
                        })
                    }
                  }
                }}
              >
                {t('Confirm')}
              </ButtonPrimary>
            )}
          </BottomGrouping>
        </ConfirmContent>
      </ModalContent>
      <AppBody>
        <Title
          title={config.env === 'dev' ? t('router') : t('swap')}
          isNavLink={config.getCurConfigInfo().isOpenBridge ? true : false}
          tabList={
            config.getCurConfigInfo().isOpenBridge
              ? [
                  {
                    name: config.env === 'dev' ? t('router') : t('swap'),
                    path: config.env === 'dev' ? '/router' : '/swap',
                    regex: config.env === 'dev' ? /\/router/ : /\/swap/,
                    iconUrl: require('../../assets/images/icon/deposit.svg'),
                    iconActiveUrl: require('../../assets/images/icon/deposit-purple.svg')
                  },
                  {
                    name: t('pool'),
                    path: '/pool',
                    regex: /\/pool/,
                    iconUrl: require('../../assets/images/icon/pool.svg'),
                    iconActiveUrl: require('../../assets/images/icon/pool-purpl.svg')
                  }
                ]
              : []
          }
        ></Title>
        <AutoColumn gap={'sm'}>
          <SelectCurrencyInputPanel
            label={t('From')}
            value={inputBridgeValue}
            onUserInput={value => {
              // console.log(value)
              setInputBridgeValue(value)
            }}
            onCurrencySelect={inputCurrency => {
              // console.log(inputCurrency)
              setSelectCurrency(inputCurrency)
            }}
            onMax={value => {
              handleMaxInput(value)
            }}
            currency={formatCurrency}
            disableCurrencySelect={false}
            showMaxButton={true}
            isViewNetwork={true}
            onOpenModalView={value => {
              console.log(value)
              setModalOpen(value)
            }}
            isViewModal={modalOpen}
            id="selectCurrency"
            isError={isInputError}
            isNativeToken={isNativeToken}
            // isViewMode={false}
            // modeConent={{txt: swapType === 'send' ? t('Simple') : t('Advance'), isFlag: swapType === 'send'}}
            // onChangeMode={(value) => {
            //   if (value) {
            //     setSwapType('send')
            //   } else {
            //     setSwapType('swap')
            //     if (account) {
            //       setRecipient(account)
            //     }
            //   }
            // }}
            // allTokens={allTokens}
            bridgeKey={BRIDGETYPE}
            allBalances={allBalances}
          />
          {account && chainId && isUnderlying && isDestUnderlying ? (
            <LiquidityView>
              {t('pool')}
              {curChain && isUnderlying ? (
                <div className="item">
                  <TokenLogo
                    symbol={
                      config.getCurChainInfo(curChain.chain).networkLogo ??
                      config.getCurChainInfo(curChain.chain)?.symbol
                    }
                    size={'1rem'}
                  ></TokenLogo>
                  <span className="cont">
                    {config.getCurChainInfo(curChain.chain).name}:{curChain.ts ? formatDecimal(curChain.ts, 2) : '0.00'}
                  </span>
                </div>
              ) : (
                ''
              )}
              {destChain && isDestUnderlying ? (
                <div className="item">
                  <TokenLogo
                    symbol={
                      config.getCurChainInfo(destChain.chain).networkLogo ??
                      config.getCurChainInfo(destChain.chain)?.symbol
                    }
                    size={'1rem'}
                  ></TokenLogo>
                  <span className="cont">
                    {config.getCurChainInfo(destChain.chain).name}:
                    {destChain.ts ? formatDecimal(destChain.ts, 2) : '0.00'}
                  </span>
                </div>
              ) : (
                ''
              )}
            </LiquidityView>
          ) : (
            ''
          )}

          <AutoRow justify="center" style={{ padding: '0 1rem' }}>
            <ArrowWrapper
              clickable={false}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                // toggleNetworkModal()
                changeNetwork(selectChain)
              }}
            >
              <ArrowDown size="16" color={theme.text2} />
            </ArrowWrapper>
            <ArrowWrapper
              clickable={false}
              style={{ cursor: 'pointer', position: 'absolute', right: 0 }}
              onClick={() => {
                if (swapType === 'swap') {
                  setSwapType('send')
                } else {
                  setSwapType('swap')
                  if (account) {
                    setRecipient(account)
                  }
                }
              }}
            >
              {swapType === 'swap' ? (
                <FlexEC>
                  <Plus size="16" color={theme.text2} />{' '}
                  <span style={{ fontSize: '12px', lineHeight: '12px' }}>{t('send')}</span>
                </FlexEC>
              ) : (
                <FlexEC>
                  <Minus size="16" color={theme.text2} />{' '}
                  <span style={{ fontSize: '12px', lineHeight: '12px' }}>{t('send')}</span>
                </FlexEC>
              )}
              {/* <Plus size="16" color={theme.text2} />
              <Minus size="16" color={theme.text2} /> */}
            </ArrowWrapper>
          </AutoRow>

          <SelectChainIdInputPanel
            label={t('to')}
            value={outputBridgeValue.toString()}
            onUserInput={value => {
              setInputBridgeValue(value)
            }}
            onChainSelect={chainID => {
              setSelectChain(chainID)
            }}
            selectChainId={selectChain}
            id="selectChainID"
            onOpenModalView={value => {
              console.log(value)
              setModalOpen(value)
            }}
            bridgeConfig={selectCurrency}
            intervalCount={intervalCount}
            isNativeToken={isNativeToken}
            selectChainList={selectChainList}
          />
          {swapType == 'swap' ? '' : <AddressInputPanel id="recipient" value={recipient} onChange={setRecipient} />}
        </AutoColumn>
        {ButtonView('INIT')}
      </AppBody>
    </>
  )
}
