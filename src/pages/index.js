import Head from "next/head";
import React, { useState } from 'react';
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

const wallet = (url, method, headers, data) => {
  return new Promise((resolve, reject) => {
    fetch(url, { method: method, body: data, headers:  new Headers(headers) })
    .then(response => {
      resolve(response.json());
    })
    .then(d => {
      reject(d);
    })
    .catch(error => {
      reject('Error:', error);
    });
  });
}

export default function Home() {
  const [form] = Form.useForm();

  function onSubmit(e) {
    const allFields = form.getFieldsValue(true);
    if (e.validateResult === true) {
      allFields.task.map((task, index)=>{
        let { api, ccy, chain, total, address, APIKey, SecretKey, Passphrase } = task;
        let apiConfig = apiOptions[apiOptions.findIndex(item => item.value == api)];
        let theCcy = ccys[ccys.findIndex(item => item.value == ccy)].label;
        let theChain = chains[chains.findIndex(item => item.value == chain)].label;
        let fee = chains[chains.findIndex(item => item.value == chain)].fee;
        //判断错误 数量<=0 
        if(!apiConfig || total <= 0){
          MessagePlugin.warning('任务'+ (index/1+1) +'：禁止反向提币');
          return;
        }
        //分解地址信息
        address.split('\n').map(addr => {
          //初始化数据
          let { url, path, method } = apiConfig;
          let headers = JSON.parse(JSON.stringify(apiConfig.headers));
          let data = JSON.parse(JSON.stringify(apiConfig.data));
          //替换数据
          Object.getOwnPropertyNames(data).map(key => {
            data[key] = data[key].replace("{total}", total);
            data[key] = data[key].replace("{fee}", fee);
            data[key] = data[key].replace("{ccy}", ccy);
            data[key] = data[key].replace("{chain}", chain);
            data[key] = data[key].replace("{address}", addr);
          });
          //生成SIGN 替换协议头
          let timestamp = new Date().toISOString();
          let SIGN = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(timestamp + method + path + JSON.stringify(data), SecretKey));
          Object.getOwnPropertyNames(headers).map(key => {
            headers[key] = headers[key].replace("{APIKey}", APIKey);
            headers[key] = headers[key].replace("{SecretKey}", SIGN);
            headers[key] = headers[key].replace("{Timestamp}", timestamp);
            headers[key] = headers[key].replace("{Passphrase}", Passphrase);
          });
          wallet(url+path, method, headers, JSON.stringify(data)).then(res=>{
            if(res.code == '0'){
              NotificationPlugin.success({
                title: "成功",
                content: addr
              });
            }else{
              NotificationPlugin.error({
                placement: 'top-left',
                title: "提币失败",
                content: addr + "："+ res.msg
              });
            }
          });
        });
      });
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
                        <Select options={ccys}></Select>
                      </FormItem>
                      <FormItem
                        {...restField}
                        name={[name, 'chain']}
                        label="链"  
                        rules={[{ required: true, type: 'error' }]}
                      >
                        <Select options={chains}></Select>
                      </FormItem>
                      <FormItem {...restField} name={[name, 'total']} label="数量" rules={[{ required: true, type: 'error' }]}>
                        <Input />
                      </FormItem>
                      <FormItem>
                        <MinusCircleIcon size="20px" style={{ cursor: 'pointer' }} onClick={() => remove(name)} />
                      </FormItem>
                    </FormItem>
                    <FormItem {...restField} name={[name, 'APIKey']} label="APIKey" rules={[{ required: true, type: 'error' }]}>
                      <Input />
                    </FormItem>
                    <FormItem {...restField} name={[name, 'SecretKey']} label="SecretKey" rules={[{ required: true, type: 'error' }]}>
                      <Input />
                    </FormItem>
                    <FormItem {...restField} name={[name, 'Passphrase']} label="Passphrase" rules={[{ required: true, type: 'error' }]}>
                      <Input />
                    </FormItem>
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
        </div>
      </main>
    </>
  );
}
