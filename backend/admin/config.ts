import { Bucket } from "encore.dev/storage/objects";
import log from "encore.dev/log";

// Centralized bucket for all configurations
export const configBucket = new Bucket("atexya-configs", { versioned: true });

// Configuration Types
export interface PromoConfig {
  active: boolean;
  discount_percent: number;
  expires: string;
  label: string;
}

export interface LinksConfig {
  header_urls: Array<{ label: string; url: string }>;
  footer_urls: Array<{ label: string; url: string }>;
  orias: string;
}

export interface Broker {
  code: string;
  name: string;
  rate: number;
  active: boolean;
}
export interface BrokersConfig {
  brokers: Broker[];
}

export interface CgvConfig {
  version: string;
}

export interface PricingConfig {
  pivot_headcount: number;
  slope: number;
  min_ttc_standard: Record<number, number>;
  min_ttc_premium: Record<number, number> | null;
}

// Helper function to get a config file
export async function getConfig<T>(filename: string, defaultConfig: T): Promise<T> {
  try {
    if (await configBucket.exists(filename)) {
      const data = await configBucket.download(filename);
      return JSON.parse(data.toString());
    }
  } catch (error) {
    log.error(`Failed to read config ${filename}`, { error });
  }
  return defaultConfig;
}

// Helper function to update a config file
export async function updateConfig<T>(filename: string, config: T): Promise<void> {
  try {
    const data = Buffer.from(JSON.stringify(config, null, 2));
    await configBucket.upload(filename, data, { contentType: 'application/json' });
  } catch (error) {
    log.error(`Failed to write config ${filename}`, { error });
    throw error;
  }
}
