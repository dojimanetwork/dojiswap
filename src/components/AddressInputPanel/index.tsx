import React, { useContext, useCallback } from 'react'
import styled, { ThemeContext } from 'styled-components'
import { useTranslation } from 'react-i18next'
import useENS from '../../hooks/useENS'
import { useActiveWeb3React } from '../../hooks'
import { ExternalLink, TYPE } from '../../theme'
import { AutoColumn } from '../Column'
import { RowBetween } from '../Row'
import { getEtherscanLink } from '../../utils'

import config from '../../config'

const InputPanel = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  position: relative;
  border-radius: 1.25rem;
  background: ${({ theme }) => theme.contentBg};
  z-index: 1;
  width: 100%;
  ${({ theme }) => theme.mediaWidth.upToLarge`
    flex-wrap:wrap;
    padding: 0;
  `};
`

const ContainerRow = styled.div<{ error: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 1.25rem;
  border: 1px solid ${({ error, theme }) => (error ? theme.red1 : theme.bg2)};
  transition: border-color 300ms ${({ error }) => (error ? 'step-end' : 'step-start')},
    color 500ms ${({ error }) => (error ? 'step-end' : 'step-start')};
  background: ${({ theme }) => theme.contentBg};
`

const InputContainer = styled.div`
  flex: 1;
  padding: 1.25rem 2.5rem;
  ${({ theme }) => theme.mediaWidth.upToLarge`
    padding: 1rem 1rem;
  `}
`

const Input = styled.input<{ error?: boolean }>`
  font-size: 1.25rem;
  outline: none;
  border: none;
  flex: 1 1 auto;
  width: 0;
  background: ${({ theme }) => theme.contentBg};
  transition: color 300ms ${({ error }) => (error ? 'step-end' : 'step-start')};
  color: ${({ error, theme }) => (error ? theme.red1 : theme.textColorBold)};
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  width: 100%;
  height: 70px;
  border-bottom: 0.0625rem solid ${({ theme }) => theme.inputBorder};
  ::placeholder {
    color: ${({ theme }) => theme.text4};
  }
  padding: 0px;
  -webkit-appearance: textfield;

  ::-webkit-search-decoration {
    -webkit-appearance: none;
  }

  ::-webkit-outer-spin-button,
  ::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }

  ::placeholder {
    color: ${({ theme }) => theme.text4};
  }
  ${({ theme }) => theme.mediaWidth.upToLarge`
    width: 100%;
    margin-right: 0;
    height: 50px;
    font-size: 24px;
  `};
`

export default function AddressInputPanel({
  id,
  value,
  onChange,
  disabledInput = false,
  isValid = true
}: {
  id?: string
  // the typed string value
  value: string
  // triggers whenever the typed value changes
  onChange?: (value: string) => void
  disabledInput?: boolean
  isValid?: boolean
}) {
  const { chainId } = useActiveWeb3React()
  const theme = useContext(ThemeContext)
  const { t } = useTranslation()
  const { address, loading, name } = useENS(value)

  const handleInput = useCallback(
    event => {
      const input = event.target.value
      const withoutSpaces = input.replace(/\s+/g, '')
      if (onChange) onChange(withoutSpaces)
    },
    [onChange]
  )

  const error =  isValid && Boolean(value.length > 0 && !loading && !address && !disabledInput)

  return (
    <InputPanel id={id}>
      <ContainerRow error={error}>
        <InputContainer>
          <AutoColumn gap="md">
            <RowBetween>
              <TYPE.black color={theme.text2} fontWeight={500} fontSize={14}>
                {t('Recipient')}
              </TYPE.black>
              {address && chainId && (
                <ExternalLink href={getEtherscanLink(chainId, name ?? address, 'address')} style={{ fontSize: '14px' }}>
                  ({t('ViewOn')} {config.getCurChainInfo(chainId).name})
                </ExternalLink>
              )}
            </RowBetween>
            <Input
              className="recipient-address-input"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              placeholder={t('WalletAddress')}
              error={error}
              pattern="^(0x[a-fA-F0-9]{40})$"
              onChange={handleInput}
              value={value}
              disabled={disabledInput}
            />
          </AutoColumn>
        </InputContainer>
      </ContainerRow>
    </InputPanel>
  )
}
