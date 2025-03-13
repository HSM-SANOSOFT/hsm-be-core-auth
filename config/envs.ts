import 'dotenv/config';

import * as dotenv from 'dotenv';
import * as joi from 'joi';
import * as path from 'path';

const pathGlobal = '../../../HSM-KUBERNETES/.env';
dotenv.config({
  path: path.resolve(__dirname, pathGlobal),
});

const pathSpecific = '../../../HSM-KUBERNETES/envs/hsm-be-core-auth.env';
dotenv.config({
  path: path.resolve(__dirname, pathSpecific),
});

interface EnvVars {
  HSM_BE_CORE_AUTH_NAME: string;
  HSM_BE_CORE_AUTH_HOST: string;
  HSM_BE_CORE_AUTH_PORT: number;
  HSM_BE_CORE_AUTH_WS_PORT: number;

  DB_USER: string;
  DB_PASSWORD: string;
  DB_CONNECTION_STRING: string;
  LD_LIBRARY_PATH: string;

  JWT_SECRET: string;
}

const envsSchema = joi
  .object({
    HSM_BE_CORE_AUTH_NAME: joi.string().required(),
    HSM_BE_CORE_AUTH_HOST: joi.string().default('0.0.0.0'),
    HSM_BE_CORE_AUTH_PORT: joi.number().required(),
    HSM_BE_CORE_AUTH_WS_PORT: joi.number().required(),

    DB_USER: joi.string().required(),
    DB_PASSWORD: joi.string().required(),
    DB_CONNECTION_STRING: joi.string().required(),
    LD_LIBRARY_PATH: joi.string().default('C:/ORACLE/instantclient_12_1'),

    JWT_SECRET: joi.string().default('sanosoft'),
  })
  .unknown()
  .required();

const validationSchema = envsSchema.validate(process.env);

if (validationSchema.error) {
  throw new Error(`Config validation error: ${validationSchema.error.message}`);
}

const envVars: EnvVars = validationSchema.value as EnvVars;

export const envs = {
  HSM_BE_CORE_AUTH_NAME: envVars.HSM_BE_CORE_AUTH_NAME,
  HSM_BE_CORE_AUTH_HOST: envVars.HSM_BE_CORE_AUTH_HOST,
  HSM_BE_CORE_AUTH_PORT: envVars.HSM_BE_CORE_AUTH_PORT,
  HSM_BE_CORE_AUTH_WS_PORT: envVars.HSM_BE_CORE_AUTH_WS_PORT,

  DB_USER: envVars.DB_USER,
  DB_PASSWORD: envVars.DB_PASSWORD,
  DB_CONNECTION_STRING: envVars.DB_CONNECTION_STRING,
  LD_LIBRARY_PATH: envVars.LD_LIBRARY_PATH,

  JWT_SECRET: envVars.JWT_SECRET,
};
