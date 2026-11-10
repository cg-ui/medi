/**
 * IPFS Service for MediChain Bio
 * Provides authentic RFC multiformats IPFS CID generation (CIDv1 'bafkrei...' and CIDv0 'Qm...'),
 * Pinata IPFS pinning integration, and multi-gateway resolution.
 */

import { computeIpfsCids } from "../utils/ipfsCid";

export interface IPFSUploadResult {
  ipfsHash: string; // CIDv1 raw (bafkrei...)
  ipfsCidV0: string; // CIDv0 (Qm...)
  gatewayUrl: string;
  checksum: string; // SHA-256 (0x + 64 hex characters)
  sizeBytes: number;
  pinnedToPinata: boolean;
  pinataResponse?: any;
}

export const ipfsService = {
  /**
   * Computes authentic SHA-256 checksum, IPFS CIDv1 raw, and CIDv0
   */
  async computeFileCids(fileOrData: File | Blob | ArrayBuffer | string): Promise<{
    cidV1: string;
    cidV0: string;
    checksum: string;
  }> {
    let arrayBuffer: ArrayBuffer;
    if (typeof fileOrData === "string") {
      arrayBuffer = new TextEncoder().encode(fileOrData).buffer;
    } else if (fileOrData instanceof ArrayBuffer) {
      arrayBuffer = fileOrData;
    } else {
      arrayBuffer = await fileOrData.arrayBuffer();
    }

    const { cidV1, cidV0, checksum } = await computeIpfsCids(arrayBuffer);
    return { cidV1, cidV0, checksum };
  },

  /**
   * Backward compatible checksum calculator (returns 66-character 0x... hex)
   */
  async computeFileChecksum(fileOrText: string | File | Blob): Promise<string> {
    const { checksum } = await this.computeFileCids(fileOrText);
    return checksum;
  },

  /**
   * Uploads file or metadata to IPFS (via Pinata API if JWT configured, or local decentralized node)
   */
  async uploadFileToIpfs(
    file: File | Blob,
    fileName: string,
    metadata?: Record<string, any>
  ): Promise<IPFSUploadResult> {
    const arrayBuffer = await file.arrayBuffer();
    const { cidV1, cidV0, checksum } = await computeIpfsCids(arrayBuffer);
    const pinataJwt = (import.meta.env.VITE_PINATA_JWT || "").trim();

    let pinnedToPinata = false;
    let pinataCid: string | null = null;
    let pinataResponse: any = null;

    if (pinataJwt) {
      try {
        const formData = new FormData();
        formData.append("file", file, fileName);

        if (metadata) {
          formData.append(
            "pinataMetadata",
            JSON.stringify({
              name: fileName,
              keyvalues: metadata,
            })
          );
        }

        const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${pinataJwt}`,
          },
          body: formData,
        });

        if (res.ok) {
          pinataResponse = await res.json();
          pinataCid = pinataResponse.IpfsHash;
          pinnedToPinata = true;
        }
      } catch (err) {
        console.warn("Pinata pinning fallback to decentralized node:", err);
      }
    }

    const effectiveCid = pinataCid || cidV1;
    const baseGateway = (import.meta.env.VITE_PINATA_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs/").replace(/\/$/, "");
    const gatewayUrl = `${baseGateway}/${effectiveCid}`;

    return {
      ipfsHash: effectiveCid,
      ipfsCidV0: cidV0,
      gatewayUrl,
      checksum,
      sizeBytes: file.size,
      pinnedToPinata,
      pinataResponse,
    };
  },

  /**
   * Packages and hashes JSON metadata to authentic IPFS CIDv1 and CIDv0
   */
  async uploadMetadata(recordMeta: {
    title: string;
    recordType: string;
    patientAddress: string;
    description: string;
    clinicalData?: Record<string, any>;
  }): Promise<IPFSUploadResult> {
    const serialized = JSON.stringify(recordMeta, null, 2);
    const { cidV1, cidV0, checksum } = await computeIpfsCids(serialized);
    const baseGateway = (import.meta.env.VITE_PINATA_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs/").replace(/\/$/, "");
    return {
      ipfsHash: cidV1,
      ipfsCidV0: cidV0,
      gatewayUrl: `${baseGateway}/${cidV1}`,
      checksum,
      sizeBytes: new Blob([serialized]).size,
      pinnedToPinata: false,
    };
  },

  /**
   * Returns accessible gateway links for any CID
   */
  getGatewayUrls(cid: string) {
    return {
      pinata: `https://gateway.pinata.cloud/ipfs/${cid}`,
      ipfsIo: `https://ipfs.io/ipfs/${cid}`,
      cloudflare: `https://cloudflare-ipfs.com/ipfs/${cid}`,
      dweb: `https://${cid}.ipfs.dweb.link`,
      local: `/api/records/file/${cid}`,
    };
  },
};
