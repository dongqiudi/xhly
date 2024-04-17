import Head from "next/head";
import React, { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { Textarea, MessagePlugin, NotificationPlugin, Form, Input, Button, Select } from 'tdesign-react/lib/'; // 按需引入无样式组件代码
import { MinusCircleIcon } from 'tdesign-icons-react';

const inter = Inter({ subsets: ["latin"] });
const { FormItem, FormList } = Form;

const ccys = [
  { label: "USDT", value: "USDT" },
  { label: "ETH", value: "ETH" },
  { label: "BTC", value: "BTC" },
  { label: "MATIC", value: "MATIC" },
  { label: "JUP", value: "JUP" },
  { label: "SOL", value: "SOL" }
];

const chains = [
  { label: "USDT-Optimism", value: "USDT-Optimism", fee: "0.15" },
  { label: "BTC-Bitcoin", value: "BTC-Bitcoin", fee: "0.005" },
  { label: "SOL-Solana", value: "SOL-Solana", fee: "0.016" },
  { label: "ETH-Arbitrum One", value: "ETH-Arbitrum One", fee: "0.0001" },
  { label: "ETH-Optimism", value: "ETH-Optimism", fee: "0.00004" },
  { label: "ETH-zkSync Era", value: "ETH-zkSync Era", fee: "0.000041" },
  { label: "ETH-Linea", value: "ETH-Linea", fee: "0.0002" },
  { label: "JUP-Solana", value: "JUP-Solana", fee: "1.8" },
  { label: "MATIC-Polygon", value: "MATIC-Polygon", fee: "0.1" }
];

const apiOptions = [{
  label: "欧易",
  value: "okx",
  path: "/api/v5/asset/withdrawal",
  url: "https://www.okx.com",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": "{APIKey}",  //OK-ACCESS-KEY字符串类型的APIKey。
    "OK-ACCESS-SIGN": "{SecretKey}",  //OK-ACCESS-SIGN使用HMAC SHA256哈希函数获得哈希值，再使用Base-64编码（请参阅签名）。
    "OK-ACCESS-TIMESTAMP": "{Timestamp}",   //OK-ACCESS-TIMESTAMP发起请求的时间（UTC），如：2020-12-08T09:08:57.715Z
    "OK-ACCESS-PASSPHRASE": "{Passphrase}"  //OK-ACCESS-PASSPHRASE您在创建API密钥时指定的Passphrase。
  },
  data: {
    "amt": "{total}", //数量
    "fee": "{fee}", //手续费
    "dest": "4", //方式 3内部转账 4链上提币
    "ccy": "{ccy}", //币种
    "chain":"{chain}", //链
    "toAddr":"{address}" //地址
  }
}];

async function sendWithdrawRequest(apiConfig, { total, fee, ccy, chain, address, APIKey, SecretKey, Passphrase }) {
  const { url, path, method, headers, data } = apiConfig;
  const timestamp = new Date().toISOString();
  
  // 替换data中的占位符为实际的参数值
  const processedData = JSON.stringify({
    ...data,
    amt: total.toString(), // 确保amt是字符串格式，如果API要求的是数字，去掉toString()
    fee: fee, // 根据API要求，如果需要，转换为字符串
    ccy: ccy,
    chain: chain,
    toAddr: address
  });

  // 生成签名
  const signString = timestamp + method + path + processedData;
  const SIGN = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(signString, SecretKey));

  const finalHeaders = {
    ...headers,
    "OK-ACCESS-KEY": APIKey,
    "OK-ACCESS-SIGN": SIGN,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": Passphrase,
  };

  const response = await fetch(url + path, { method, headers: new Headers(finalHeaders), body: processedData });
  return response.json();
}

export default function Home() {
  const [form] = Form.useForm();
  const [filteredChains, setFilteredChains] = useState(chains);
  const [theme, setTheme] = useState('light'); // 默认为'light'主题

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    // 初始化时设置默认的链选项
    handleCcyChange(ccys[0].value);
  }, [theme]);

  // 当币种选择变化时调用
  const handleCcyChange = (selectedCcy) => {
    // 根据币种前缀过滤出匹配的链选项
    const matchingChains = chains.filter(chain => chain.value.startsWith(selectedCcy));
    setFilteredChains(matchingChains);
    // 如果需要，也可以在这里自动设置链的值为第一个匹配的选项
    // form.setFieldsValue({ chain: matchingChains[0]?.value });
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  async function onSubmit(e) {
    const allFields = form.getFieldsValue(true);
    if (e.validateResult === true) {
      for (const [index, task] of allFields.task.entries()) {
        const { api, ccy, chain, total, address, APIKey, SecretKey, Passphrase } = task;
        const apiConfig = apiOptions.find(item => item.value === api);
        const chainConfig = chains.find(item => item.value === chain);
        const fee = chainConfig ? chainConfig.fee : null;

        if (!apiConfig || total <= 0) {
          MessagePlugin.warning(`任务${index + 1}：禁止反向提币`);
          continue;
        }

        const addresses = address.split('\n');
        for (let i = 0; i < addresses.length; i++) {
          if (i > 0 && i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 每处理5个地址后等待1秒
          }
          try {
            const response = await sendWithdrawRequest(apiConfig, { total, fee, ccy, chain, address: addresses[i], APIKey, SecretKey, Passphrase });
            if (response.code === '0') {
              NotificationPlugin.success({ title: "成功", content: addresses[i] });
            } else {
              NotificationPlugin.error({ placement: 'top-left', title: "提币失败", content: `${addresses[i]}：${response.msg}` });
            }
          } catch (error) {
            NotificationPlugin.error({ placement: 'top-left', title: "请求失败", content: `${addresses[i]}：${error}` });
          }
        }
      }
    }
  }

  return (
    <>
      <Head>
        <title>批量提币系统</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`${styles.main} ${inter.className}`}>
        <div className={styles.center}>
          <h1 style={{ textAlign: 'center', fontSize: '3em', backgroundImage: 'linear-gradient(45deg, red, blue)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '50px' }}>星火提币系统</h1>
        <Form form={form} onSubmit={onSubmit}>
          <FormList name="task">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <>
                    <FormItem key={key}>
                      <FormItem
                        {...restField}
                        name={[name, 'api']}
                        label="接口"
                        rules={[{ required: true, type: 'error' }]}
                      >
                        <Select options={apiOptions}></Select>
                      </FormItem>
                      <FormItem
                        {...restField}
                        name={[name, 'ccy']}
                        label="币种"
                        rules={[{ required: true, type: 'error' }]}
                      >
                        <Select options={ccys} onChange={(value) => handleCcyChange(value)}></Select>
                      </FormItem>
                      <FormItem
                        {...restField}
                        name={[name, 'chain']}
                        label="链"  
                        rules={[{ required: true, type: 'error' }]}
                      >
                        <Select options={filteredChains}></Select>
                      </FormItem>
                      <FormItem {...restField} name={[name, 'total']} label="数量" rules={[{ required: true, type: 'error' }]}>
                        <Input />
                      </FormItem>
                      <FormItem>
                        <MinusCircleIcon size="20px" style={{ cursor: 'pointer' }} onClick={() => remove(name)} />
                      </FormItem>
                    </FormItem>
                    <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '5px', marginBottom: '10px' }}>
                      <FormItem {...restField} name={[name, 'APIKey']} label="APIKey" rules={[{ required: true, type: 'error' }]}>
                        <Input />
                      </FormItem>
                      <FormItem {...restField} name={[name, 'SecretKey']} label="SecretKey" rules={[{ required: true, type: 'error' }]}>
                        <Input />
                      </FormItem>
                      <FormItem {...restField} name={[name, 'Passphrase']} label="Passphrase" rules={[{ required: true, type: 'error' }]}>
                        <Input />
                      </FormItem>
                    </div>
                    <FormItem {...restField} name={[name, 'address']} label="地址" rules={[{ required: true, type: 'error' }]}>
                      <Textarea />
                    </FormItem>
                  </>
                ))}
                <FormItem style={{ marginLeft: 100 }}>
                  <Button theme="default" variant="dashed" onClick={() => add({ api: 'okx', ccy: "", chain: "", APIKey: "", SecretKey: "", Passphrase: "", total: 0, address: "" })}>
                    添加任务
                  </Button>
                </FormItem>
              </>
            )}
          </FormList>
          <FormItem style={{ marginLeft: 100 }}>
            <Button type="submit" theme="primary">
              提交操作
            </Button>
            <Button type="reset" style={{ marginLeft: 12 }}>
              重置
            </Button>
          </FormItem>
        </Form>
        <Button onClick={toggleTheme} style={{ position: 'fixed', top: '10px', right: '10px' }}>切换主题</Button>
        </div>
      </main>
    </>
  );
}
