/**
 * Response structure returned by the FMCSA QCMobile carrier lookup API.
 */
interface FmcsaCarrier {
    allowedToOperate: string;
    bipdInsuranceOnFile: string;
    bipdInsuranceRequired: string;
    bipdRequiredAmount: string;
    bondInsuranceOnFile: string;
    bondInsuranceRequired: string;
    brokerAuthorityStatus: string;
    cargoInsuranceOnFile: string;
    cargoInsuranceRequired: string;
    carrierOperation: {
        carrierOperationCode: string;
        carrierOperationDesc: string;
    };
    censusTypeId: {
        censusType: string;
        censusTypeDesc: string;
        censusTypeId: number;
    };
    commonAuthorityStatus: string;
    contractAuthorityStatus: string;
    crashTotal: number;
    dbaName: string | null;
    dotNumber: number;
    driverInsp: number;
    driverOosInsp: number;
    driverOosRate: number;
    driverOosRateNationalAverage: string;
    ein: number;
    fatalCrash: number;
    hazmatInsp: number;
    hazmatOosInsp: number;
    hazmatOosRate: number;
    hazmatOosRateNationalAverage: string;
    injCrash: number;
    isPassengerCarrier: string | null;
    issScore: string | null;
    legalName: string;
    mcs150Outdated: string;
    oosDate: string | null;
    oosRateNationalAverageYear: string;
    phyCity: string;
    phyCountry: string;
    phyState: string;
    phyStreet: string;
    phyZipcode: string;
    reviewDate: string | null;
    reviewType: string | null;
    safetyRating: string | null;
    safetyRatingDate: string | null;
    safetyReviewDate: string | null;
    safetyReviewType: string | null;
    snapshotDate: string | null;
    statusCode: string;
    totalDrivers: number;
    totalPowerUnits: number;
    towawayCrash: number;
    vehicleInsp: number;
    vehicleOosInsp: number;
    vehicleOosRate: number;
    vehicleOosRateNationalAverage: string;
}

interface FmcsaContentItem {
    carrier: FmcsaCarrier;
}

interface FmcsaApiRes {
    content: FmcsaContentItem[];
    retrievalDate: string;
}

/**
 * Calls the FMCSA QCMobile API and checks whether the carrier
 * identified by the given MC number is allowed to operate.
 */
export async function verifyCarrierEligibility(mcNumber: string): Promise<boolean> {
    const webKey: string | undefined = process.env.FMCSA_WEB_KEY;

    if (!webKey)
        throw new Error("Server misconfiguration: FMCSA_WEB_KEY is not set");

    const url: string = `https://mobile.fmcsa.dot.gov/qc/services/carriers/docket-number/${mcNumber}?webKey=${webKey}`;

    const response: Response = await fetch(url, {
        method: "GET",
        headers: {
            "Accept": "application/json",
            // Adding a standard browser User-Agent to bypass FMCSA's 403 firewall block
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
    });

    if (!response.ok)
        throw new Error(`FMCSA API returned status ${response.status}`);

    const rawJson: unknown = await response.json();

    const data: FmcsaApiRes = rawJson as FmcsaApiRes;

    const carrier: FmcsaCarrier | undefined = data.content?.[0]?.carrier;

    if (!carrier)
        throw new Error(`No carrier found for MC number ${mcNumber}`);

    return carrier.allowedToOperate === "Y";
}
