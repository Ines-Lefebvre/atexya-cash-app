import { api } from "encore.dev/api";
import { admin } from "~encore/clients";

interface BrokerValidationRequest {
  broker_code: string;
}

interface BrokerValidationResponse {
  valid: boolean;
  broker_name?: string;
}

// Valide un code courtier
export const validateBroker = api<BrokerValidationRequest, BrokerValidationResponse>(
  { expose: true, method: "POST", path: "/brokers/validate" },
  async (params) => {
    try {
      // Try to get brokers config from admin service
      const brokersConfig = await admin.getBrokers();
      
      const broker = brokersConfig.brokers.find(b => b.code === params.broker_code && b.active);
      
      return {
        valid: !!broker,
        broker_name: broker?.name
      };
    } catch (error) {
      // Fallback to hardcoded brokers if admin service fails
      const validBrokers: Record<string, string> = {
        "COURT001": "Courtier Alpha",
        "COURT002": "Courtier Beta",
        "COURT003": "Courtier Gamma"
      };

      const brokerName = validBrokers[params.broker_code];
      
      return {
        valid: !!brokerName,
        broker_name: brokerName
      };
    }
  }
);
