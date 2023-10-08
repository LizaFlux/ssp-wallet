import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Image, Button, Form, message, Spin } from 'antd';
import localForage from 'localforage';
import {
  setTransactions,
  setBlockheight,
  setWalletInUse,
  setActiveChain,
} from '../../store';
import { setBalance, setUnconfirmedBalance, setAddress } from '../../store';

import {
  EyeInvisibleOutlined,
  EyeTwoTone,
  LockOutlined,
} from '@ant-design/icons';
import secureLocalStorage from 'react-secure-storage';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../hooks';

import {
  setXpubWallet,
  setXpubKey,
  setXpubKeyIdentity,
  setXpubWalletIdentity,
  setPasswordBlob,
  setSspWalletIdentity,
} from '../../store';

import './Login.css';
import {
  decrypt as passworderDecrypt,
  encrypt as passworderEncrypt,
} from '@metamask/browser-passworder';
import { NoticeType } from 'antd/es/message/interface';
import { getFingerprint } from '../../lib/fingerprint';

import { generateIdentityAddress, getScriptType } from '../../lib/wallet.ts';
import PoweredByFlux from '../../components/PoweredByFlux/PoweredByFlux.tsx';
import FiatCurrencyController from '../../components/FiatCurrencyController/FiatCurrencyController.tsx';
import { transaction, generatedWallets, cryptos } from '../../types';
import { blockchains } from '@storage/blockchains';

interface loginForm {
  password: string;
}

interface balancesObj {
  confirmed: string;
  unconfirmed: string;
}

const balancesObject = {
  confirmed: '0.00',
  unconfirmed: '0.00',
};

type pwdDecrypt = Record<string, string>;

function Login() {
  const { t } = useTranslation(['login']);
  const alreadyMounted = useRef(false); // as of react strict mode, useEffect is triggered twice. This is a hack to prevent that without disabling strict mode
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { activeChain, identityChain } = useAppSelector(
    (state) => state.sspState,
  );
  const blockchainConfig = blockchains[activeChain];
  const blockchainConfigIdentity = blockchains[identityChain];

  useEffect(() => {
    if (alreadyMounted.current) return;
    alreadyMounted.current = true;
    // get activatedChain
    const activatedChain = secureLocalStorage.getItem('activeChain');
    if (typeof activatedChain === 'string' && blockchains[activatedChain]) {
      const aC: keyof cryptos = activatedChain as keyof cryptos;
      dispatch(setActiveChain(aC));
    }
    // check if existing user
    const accPresent = secureLocalStorage.getItem('walletSeed');
    // no wallet seed present
    if (!accPresent) {
      navigate('/welcome');
      return;
    }
    // check if we have password
    void (async function () {
      if (chrome?.storage?.session) {
        try {
          // if different browser we will need to be inputting password every time
          const resp: pwdDecrypt = await chrome.storage.session.get('pwBlob');
          const fingerprint: string = getFingerprint();
          const pwd = await passworderDecrypt(fingerprint, resp.pwBlob);
          if (typeof pwd === 'string') {
            setIsLoading(true);
            setPassword(pwd);
          } else {
            setIsLoading(false);
          }
        } catch (error) {
          console.log(error);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    })();
  });

  const [messageApi, contextHolder] = message.useMessage();
  const displayMessage = (type: NoticeType, content: string) => {
    void messageApi.open({
      type,
      content,
    });
  };

  const onFinish = (values: loginForm) => {
    if (values.password.length < 8) {
      displayMessage('error', t('login:err_invalid_pw'));
      return;
    }
    setPassword(values.password);
  };

  useEffect(() => {
    if (password) {
      decryptWallet();
    }
  }, [password]);

  const decryptWallet = () => {
    // get SSP identity keys
    const xpubEncryptedIdentity = secureLocalStorage.getItem(
      `xpub-48-${blockchainConfigIdentity.slip}-0-${getScriptType(
        blockchainConfigIdentity.scriptType,
      )}`,
    );
    const xpub2EncryptedIdentity = secureLocalStorage.getItem(
      `2-xpub-48-${blockchainConfigIdentity.slip}-0-${getScriptType(
        blockchainConfigIdentity.scriptType,
      )}`,
    ); // key xpub
    // we only need xpub for now for chain
    const xpubEncrypted = secureLocalStorage.getItem(
      `xpub-48-${blockchainConfig.slip}-0-${getScriptType(
        blockchainConfig.scriptType,
      )}`,
    );
    const xpub2Encrypted = secureLocalStorage.getItem(
      `2-xpub-48-${blockchainConfig.slip}-0-${getScriptType(
        blockchainConfig.scriptType,
      )}`,
    ); // key xpub
    if (!xpubEncrypted || !xpubEncryptedIdentity) {
      displayMessage('error', t('login:err_l3'));
      setIsLoading(false);
      return;
    }
    if (
      typeof xpubEncrypted === 'string' &&
      typeof xpubEncryptedIdentity === 'string'
    ) {
      passworderDecrypt(password, xpubEncrypted)
        .then(async (xpub) => {
          const xpubIdentity = await passworderDecrypt(password, xpubEncryptedIdentity);
          // set xpubs of chains
          if (typeof xpub === 'string' && typeof xpubIdentity === 'string') {
            console.log(xpub);
            dispatch(setXpubWallet(xpub));
            console.log(xpubIdentity);
            dispatch(setXpubWalletIdentity(xpub));
            if (typeof xpub2Encrypted === 'string') {
              const xpub2 = await passworderDecrypt(password, xpub2Encrypted);
              if (typeof xpub2 === 'string') {
                dispatch(setXpubKey(xpub2));
              }
            }
            if (typeof xpub2EncryptedIdentity === 'string') {
              const xpub2Identity = await passworderDecrypt(password, xpub2EncryptedIdentity);
              if (typeof xpub2Identity === 'string') {
                dispatch(setXpubKeyIdentity(xpub2Identity));
              }
            }
            const fingerprint: string = getFingerprint();
            const pwBlob = await passworderEncrypt(fingerprint, password);
            if (chrome?.storage?.session) {
              // if different browser we will need to be inputting password every time
              await chrome.storage.session.set({
                pwBlob: pwBlob,
              });
            }
            dispatch(setPasswordBlob(pwBlob));
            // generate ssp wallet identity
            const generatedSspWalletIdentity = generateIdentityAddress(
              xpubIdentity,
              identityChain,
            );
            dispatch(setSspWalletIdentity(generatedSspWalletIdentity));
            // restore stored wallets
            const generatedWallets: generatedWallets =
              (await localForage.getItem(`wallets-${activeChain}`)) ?? {};
            const walletDerivations = Object.keys(generatedWallets);
            walletDerivations.forEach((derivation: string) => {
              dispatch(
                setAddress({
                  wallet: derivation,
                  data: generatedWallets[derivation],
                }),
              );
            });
            const walInUse: string =
              (await localForage.getItem(`walletInUse-${activeChain}`)) ??
              '0-0';
            dispatch(setWalletInUse(walInUse));
            // load txs, balances, settings etc.
            const txsWallet: transaction[] =
              (await localForage.getItem(
                `transactions-${activeChain}-${walInUse}`,
              )) ?? [];
            const blockheightChain: number =
              (await localForage.getItem(`blockheight-${activeChain}`)) ?? 0;
            const balancesWallet: balancesObj =
              (await localForage.getItem(
                `balances-${activeChain}-${walInUse}`,
              )) ?? balancesObject;
            if (txsWallet) {
              dispatch(
                setTransactions({ wallet: walInUse, data: txsWallet }),
              ) ?? [];
            }
            if (balancesWallet) {
              dispatch(
                setBalance({
                  wallet: walInUse,
                  data: balancesWallet.confirmed,
                }),
              );
              dispatch(
                setUnconfirmedBalance({
                  wallet: walInUse,
                  data: balancesWallet.unconfirmed,
                }),
              );
            }
            if (blockheightChain) {
              dispatch(setBlockheight(blockheightChain));
            }
            navigate('/home');
          } else {
            displayMessage('error', t('login:err_l2'));
            setIsLoading(false);
          }
        })
        .catch((error) => {
          setIsLoading(false);
          displayMessage('error', t('login:err_invalid_pw_2'));
          console.log(error);
        });
    } else {
      displayMessage('error', t('login:err_l1'));
      setIsLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      {isLoading && <Spin size="large" />}
      {!isLoading && (
        <>
          <Image
            width={80}
            preview={false}
            src="/ssp-logo.svg"
            style={{ paddingTop: 70 }}
          />
          <h2>{t('login:welcome_back')}</h2>
          <h3>{t('login:to_dec_cloud')}</h3>
          <br />
          <br />
          <Form
            name="loginForm"
            initialValues={{ tos: false }}
            onFinish={(values) => void onFinish(values as loginForm)}
            autoComplete="off"
            layout="vertical"
          >
            <Form.Item label={t('login:unlock_with_pw')} name="password">
              <Input.Password
                size="large"
                placeholder={t('login:enter_pw')}
                prefix={<LockOutlined />}
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
                className="password-input"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" size="large" htmlType="submit">
                {t('login:unlock_wallet')}
              </Button>
            </Form.Item>
          </Form>
          <br />
          <br />
          <Button
            type="link"
            block
            size="small"
            onClick={() => navigate('/restore')}
          >
            {t('login:forgot_pw')} <i> {t('login:restore')}</i>
          </Button>
          <PoweredByFlux />
          <FiatCurrencyController />
        </>
      )}
    </>
  );
}

export default Login;
