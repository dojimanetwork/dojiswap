import { Currency } from 'anyswap-sdk'
import React, { useState, useContext, useCallback, useEffect, useMemo} from 'react'
import styled, { ThemeContext } from 'styled-components'
import { useTranslation } from 'react-i18next'

import { useCurrencyBalance, useETHBalances } from '../../state/wallet/hooks'
import { RowBetween } from '../Row'
import { Input as NumericalInput } from '../NumericalInput'
import TokenLogo from '../TokenLogo'

import { TYPE } from '../../theme'

import { useActiveWeb3React } from '../../hooks'
// import { useToggleNetworkModal } from '../../state/application/hooks'
import config from '../../config'
import {formatDecimal} from '../../utils/tools/tools'
import { useBridgeTokenList } from '../../state/lists/hooks'

import {
  InputRow,
  CurrencySelect,
  ErrorSpanBox,
  ErrorSpan,
  ExtraText,
  LabelRow,
  Aligner,
  TokenLogoBox,
  InputPanel,
  Container,
  StyledTokenName,
  CurrencySelectBox,
  HideSmallBox
} from './styleds'

import SearchModal from './searchModal'

const HeadterRightBox = styled.div`

`

interface SelectCurrencyInputPanelProps {
  value: string  // token amount
  onUserInput: (value: string) => void // user input amount
  onMax: (value: any) => void // input max token amount
  showMaxButton: boolean // is view max function
  label?: string 
  onCurrencySelect?: (currency: Currency) => void // user select token
  // currency?: Currency | null
  currency?: any // select token
  disableCurrencySelect?: boolean // disabled select
  disableChainSelect?: boolean // disabled select
  disableInput?: boolean // disabled input
  hideBalance?: boolean // hide balance
  hideInput?: boolean // hide input
  otherCurrency?: Currency | null //
  id: string
  showCommonBases?: boolean
  customBalanceText?: string 
  inputType?: any // input type, object type, params:{swapType: 'withdraw' | 'deposit', ...{custom params}}
  // onlyUnderlying?: boolean
  isViewModal?: boolean // 是否显示选择token弹框
  onOpenModalView?: (value: any) => void // 触发打开弹框方法，同isViewModal一起使用
  isViewNetwork?: boolean // 是否显示选择网络，若true，则在头部显示余额，否则余额显示在币种旁边
  isError?: boolean // 是否输入错误
  isNativeToken?: boolean // 是否为原生native代币
  isViewMode?: boolean // 是否显示头部更多操作按钮
  modeConent?: any // 更多操作按钮内容，同isViewMode一起使用
  onChangeMode?: (value: any) => void // 更多操作按钮方法，同isViewMode一起使用
  allTokens?: any // 所有token list
  customChainId?: any // 显示自定义chainId
  bridgeKey?: any // router为：'routerTokenList' ，bridge为：'bridgeTokenList'
  allBalances?: any // all token balance
  showETH?: any // showETH
}

export default function SelectCurrencyInputPanel({
  value,
  onUserInput,
  onMax,
  showMaxButton,
  label = 'Input',
  onCurrencySelect,
  currency,
  disableCurrencySelect = false,
  disableChainSelect = false,
  disableInput = false,
  hideBalance = false,
  hideInput = false,
  otherCurrency,
  id,
  customBalanceText,
  inputType,
  // onlyUnderlying,
  isViewModal,
  onOpenModalView,
  isViewNetwork,
  isError,
  isNativeToken,
  isViewMode, 
  modeConent,
  onChangeMode,
  allTokens = {},
  customChainId,
  bridgeKey,
  allBalances,
  showETH
}: SelectCurrencyInputPanelProps) {
  const { t } = useTranslation()
  const { account, chainId } = useActiveWeb3React()
  const allTokensList:any = useBridgeTokenList(bridgeKey, chainId)
  // const account = '0x4188663a85C92EEa35b5AD3AA5cA7CeB237C6fe9'
  const useChainId = customChainId ? customChainId : chainId
  const theme = useContext(ThemeContext)
  // const toggleNetworkModal = useToggleNetworkModal()

  const [modalOpen, setModalOpen] = useState(false)

  const useTokenList = Object.keys(allTokens).length > 0 ? allTokens : allTokensList
  // const useTokenList = allTokens
  // console.log(useTokenList)
  // console.log(allTokens)
  //   console.log(allTokensList)
  const handleDismissSearch = useCallback(() => {
    // console.log(allTokens)
    // console.log(allTokensList)
    setModalOpen(false)
    if (onOpenModalView) {
      onOpenModalView(false)
    }
  }, [setModalOpen])

  const selectedCurrencyBalance = useCurrencyBalance(account ?? undefined, currency ?? undefined)
  const selectedETHBalance = useETHBalances(account ? [account] : [])?.[account ?? '']

  const useBalance = useMemo(() => {
    if (selectedCurrencyBalance && !isNativeToken) {
      return selectedCurrencyBalance
    } else if (isNativeToken) {
      if (inputType && inputType.swapType === 'withdraw' && selectedCurrencyBalance) {
        return selectedCurrencyBalance
      } else if ((inputType && inputType.swapType === 'deposit') || selectedETHBalance) {
        return selectedETHBalance
      }
      return undefined
    } else {
      return undefined
    }
  }, [selectedCurrencyBalance, isNativeToken, selectedETHBalance])
  // console.log(currency)
  // console.log(selectedETHBalance?.toSignificant(6))
  // console.log(useBalance?.toSignificant(6))
  const handleMax = useCallback(() => {
    if (useBalance) {
      onMax(useBalance?.toSignificant(6))
    } else {
      onMax('')
    }
  }, [useBalance, onMax])

  useEffect(() => {
    if (typeof isViewModal != 'undefined') {
      setModalOpen(isViewModal)
    }
  }, [isViewModal])

  const logoUrl = useMemo(() => {
    // console.log(currency)
    if (useTokenList && currency?.address) {
      for (const t in useTokenList) {
        if (
          t === currency?.address?.toLowerCase()
          || useTokenList[t]?.underlying?.address?.toLowerCase() === currency?.address?.toLowerCase()
          || useTokenList[t]?.tokenInfo?.underlying?.address?.toLowerCase() === currency?.address?.toLowerCase()
        ) {
          // console.log(useTokenList[t])
          return useTokenList[t]?.tokenInfo?.logoUrl ?? useTokenList[t]?.logoUrl
        }
      }
    }
    return ''
  }, [useTokenList, currency])

  return (
    <InputPanel id={id} className={isError ? 'error' : ''}>
      <Container hideInput={hideInput}>
        {!hideInput && (
          <LabelRow>
            <RowBetween>
              <TYPE.body color={theme.text2} fontWeight={500} fontSize={14}>
                {label}
              </TYPE.body>
              
              <HeadterRightBox>

                {isViewMode && onChangeMode ? (
                  <TYPE.body
                    onClick={() => {
                      if (modeConent.isFlag) {
                        onChangeMode(false)
                      } else {
                        onChangeMode(true)
                      }
                    }}
                    color={theme.tipColor}
                    fontWeight={500}
                    fontSize={14}
                    style={{ display: 'inline', cursor: 'pointer', marginRight: '10px', textDecoration: 'underline' }}
                  >{modeConent.txt}</TYPE.body>
                ) : ''}
                {account && showMaxButton && isViewNetwork ? (
                  <>
                    <TYPE.body
                      onClick={handleMax}
                      color={theme.text2}
                      fontWeight={500}
                      fontSize={14}
                      style={{ display: 'inline', cursor: 'pointer' }}
                    >
                      {!hideBalance && !!currency && useBalance
                        ? (customBalanceText ?? (t('balanceTxt') + ': ')) + formatDecimal(useBalance.toSignificant(6), 2)
                        : t('balanceTxt') + ': ' + '-'}
                    </TYPE.body>
                  </>
                ) : (
                  <HideSmallBox>
                    <TYPE.body
                      color={theme.text2}
                      fontWeight={500}
                      fontSize={14}
                      style={{ display: 'inline', cursor: 'pointer' }}
                    >
                      {!hideBalance && !!currency && useBalance && account
                        ? (customBalanceText ?? (t('balanceTxt') + ': ')) + formatDecimal(useBalance.toSignificant(6), 2)
                        : t('balanceTxt') + ': ' + '-'}
                    </TYPE.body>
                  </HideSmallBox>
                )}
              </HeadterRightBox>
            </RowBetween>
          </LabelRow>
        )}
        <InputRow style={hideInput ? { padding: '0', borderRadius: '8px' } : {}} selected={disableCurrencySelect}>
          {!hideInput && (
            <>
              <NumericalInput
                className={isError ? 'error' : ''}
                value={value}
                onUserInput={val => {
                  onUserInput(val)
                }}
                disabled={disableInput}
              />
            </>
          )}
          <CurrencySelectBox>

            <CurrencySelect
              selected={true}
              className="open-currency-select-button"
            >
              <Aligner>
                <TokenLogoBox>
                  <TokenLogo symbol={currency?.symbol} imgPath={require('../../assets/images/coin/source/DOJIMA.svg')} logoUrl={logoUrl} size={'24px'} />
                </TokenLogoBox>
                <StyledTokenName className="token-symbol-container" active={true}>
                  <h3>
                    {
                      "PST"
                    }
                  </h3>
                  <p>
                  PST Token
                  </p>
                </StyledTokenName>
              </Aligner>
            </CurrencySelect>
            {
              isViewNetwork ? (
                <CurrencySelect
                  selected={true}
                  className="open-currency-select-button"
                >
                  <Aligner>
                    <TokenLogoBox>
                      <TokenLogo symbol={config.getCurChainInfo(useChainId)?.networkLogo ?? config.getCurChainInfo(useChainId)?.symbol} imgPath={require('../../assets/images/coin/source/DOJIMA.svg')} size={'24px'} />
                    </TokenLogoBox>
                    <StyledTokenName className="token-symbol-container">
                      {"Dojima Testnet"}
                    </StyledTokenName>
                  </Aligner>
                </CurrencySelect>
              ) : (
                <ErrorSpanBox>
                  {
                    !hideBalance && !!currency ? (
                      <ErrorSpan onClick={handleMax}>
                        <ExtraText>
                          <h5>{t('balance')}</h5>
                          <p>
                            {!hideBalance && !!currency && useBalance
                              ? (customBalanceText ?? '') + formatDecimal(useBalance.toSignificant(6), 2)
                              : '-'}{' '}
                          </p>
                        </ExtraText>
                      </ErrorSpan>
                    ) : (
                      ''
                    )
                  }
                </ErrorSpanBox>
              )
            }
          </CurrencySelectBox>
        </InputRow>
      </Container>
      {!disableCurrencySelect && onCurrencySelect && modalOpen && (
        <SearchModal
          isOpen={modalOpen}
          onDismiss={handleDismissSearch}
          onCurrencySelect={onCurrencySelect}
          selectedCurrency={currency}
          otherSelectedCurrency={otherCurrency}
          // onlyUnderlying={onlyUnderlying}
          allTokens={useTokenList}
          chainId={chainId}
          bridgeKey={bridgeKey}
          allBalances={allBalances}
          showETH={showETH}
        />
      )}
    </InputPanel>
  )
}
