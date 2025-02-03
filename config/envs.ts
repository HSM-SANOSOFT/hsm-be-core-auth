import 'dotenv/config';

import * as dotenv from 'dotenv';
import * as joi from 'joi';
import * as path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../../../kubernetes/envs/global.env'),
});
dotenv.config({
  path: path.resolve(__dirname, '../../../kubernetes/envs/auth.env'),
});

interface EnvVars {
  HSM_CORE_AUTH_NAME: string;
  HSM_CORE_AUTH_HOST: string;
  HSM_CORE_AUTH_PORT: number;
  HSM_CORE_AUTH_WS_PORT: number;

  DB_USER: string;
  DB_PASSWORD: string;
  DB_CONNECTION_STRING: string;
  LD_LIBRARY_PATH: string;

  JWT_SECRET: string;

  HSM_CORE_COMS_NAME: string;
  HSM_CORE_COMS_HOST: string;
  HSM_CORE_COMS_PORT: number;
}

const envsSchema = joi
  .object({
    HSM_CORE_AUTH_NAME: joi.string().required(),
    HSM_CORE_AUTH_HOST: joi.string().default('localhost'),
    HSM_CORE_AUTH_PORT: joi.number().required(),
    HSM_CORE_AUTH_WS_PORT: joi.number().required(),

    DB_USER: joi.string().required(),
    DB_PASSWORD: joi.string().required(),
    DB_CONNECTION_STRING: joi.string().required(),
    LD_LIBRARY_PATH: joi.string().default('C:/ORACLE/instantclient_12_1'),

    JWT_SECRET: joi.string().default('sanosoft'),

    HSM_CORE_COMS_NAME: joi.string().required(),
    HSM_CORE_COMS_HOST: joi.string().default('localhost'),
    HSM_CORE_COMS_PORT: joi.number().required(),
  })
  .unknown()
  .required();

const { error, value } = envsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  HSM_CORE_AUTH_NAME: envVars.HSM_CORE_AUTH_NAME,
  HSM_CORE_AUTH_HOST: envVars.HSM_CORE_AUTH_HOST,
  HSM_CORE_AUTH_PORT: envVars.HSM_CORE_AUTH_PORT,
  HSM_CORE_AUTH_WS_PORT: envVars.HSM_CORE_AUTH_WS_PORT,

  DB_USER: envVars.DB_USER,
  DB_PASSWORD: envVars.DB_PASSWORD,
  DB_CONNECTION_STRING: envVars.DB_CONNECTION_STRING,
  LD_LIBRARY_PATH: envVars.LD_LIBRARY_PATH,

  JWT_SECRET: envVars.JWT_SECRET,

  HSM_CORE_COMS_NAME: envVars.HSM_CORE_COMS_NAME,
  HSM_CORE_COMS_HOST: envVars.HSM_CORE_COMS_HOST,
  HSM_CORE_COMS_PORT: envVars.HSM_CORE_COMS_PORT,
};
