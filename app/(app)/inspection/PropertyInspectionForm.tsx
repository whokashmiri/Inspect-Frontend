import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const SOFT = "#F7C59F";

type PropertyType =
  | "land"
  | "property"
  | "residential_villa"
  | "building"
  | "rest_house"
  | "farm_house"
  | "warehouse"
  | "shop_floor"
  | "residential_land"
  | "commercial_land"
  | "hotel"
  | "commercial_building"
  | "residential_building";

type InputKeyboardType =
  | "default"
  | "numeric"
  | "decimal-pad"
  | "phone-pad";

type FieldDefinition = {
  key: string;
  label: string;
  placeholder?: string;
  keyboardType?: InputKeyboardType;
  multiline?: boolean;
  required?: boolean;
  suffix?: string;
  options?: string[];
  type?: "text" | "select" | "boolean";
};

type FormSection = {
  title: string;
  description?: string;
  fields: FieldDefinition[];
};

type FormValues = Record<string, string | boolean>;

type PropertyInspectionFormProps = {
  initialValues?: FormValues;
  initialPropertyType?: PropertyType | null;
  onChange?: (
    values: FormValues,
    propertyType: PropertyType | null
  ) => void;
  onSubmit?: (
    values: FormValues,
    propertyType: PropertyType
  ) => void;
  submitLabel?: string;
};

const PROPERTY_TYPES: Array<{
  label: string;
  value: PropertyType;
}> = [
  { label: "Land", value: "land" },
  { label: "Property", value: "property" },
  { label: "Residential Villa", value: "residential_villa" },
  { label: "Building", value: "building" },
  { label: "Rest House", value: "rest_house" },
  { label: "Farm House", value: "farm_house" },
  { label: "Warehouse", value: "warehouse" },
  { label: "Shop Floor", value: "shop_floor" },
  { label: "Residential Land", value: "residential_land" },
  { label: "Commercial Land", value: "commercial_land" },
  { label: "Hotel", value: "hotel" },
  { label: "Commercial Building", value: "commercial_building" },
  { label: "Residential Building", value: "residential_building" },
];

const CONDITION_OPTIONS = [
  "Excellent",
  "Very Good",
  "Good",
  "Average",
  "Poor",
  "Under Construction",
  "Needs Renovation",
];

const OCCUPANCY_OPTIONS = [
  "Vacant",
  "Owner Occupied",
  "Tenant Occupied",
  "Partially Occupied",
  "Under Construction",
];

const STREET_TYPE_OPTIONS = [
  "Main Road",
  "Secondary Road",
  "Internal Street",
  "Service Road",
  "Commercial Street",
];

const LAND_USE_OPTIONS = [
  "Residential",
  "Commercial",
  "Mixed Use",
  "Industrial",
  "Agricultural",
  "Hospitality",
];

const CONSTRUCTION_TYPE_OPTIONS = [
  "Reinforced Concrete",
  "Steel Structure",
  "Load-Bearing Walls",
  "Prefabricated",
  "Mixed Construction",
];

const FIRE_SYSTEM_OPTIONS = [
  "Not Available",
  "Fire Extinguishers",
  "Alarm System",
  "Sprinkler System",
  "Full Civil Defense System",
];

const commonLocationFields: FieldDefinition[] = [
  {
    key: "propertyName",
    label: "Property Name",
    placeholder: "Example: Al Nakheel Villa",
    required: true,
  },
  {
    key: "city",
    label: "City",
    placeholder: "Example: Riyadh",
    required: true,
  },
  {
    key: "district",
    label: "District",
    placeholder: "Example: Al Malqa",
    required: true,
  },
  {
    key: "streetName",
    label: "Street Name",
    placeholder: "Enter street name",
  },
  {
    key: "streetType",
    label: "Street Type",
    type: "select",
    options: STREET_TYPE_OPTIONS,
  },
  {
    key: "postalCode",
    label: "Postal Code",
    placeholder: "Enter postal code",
    keyboardType: "numeric",
  },
  {
    key: "latitude",
    label: "Latitude",
    placeholder: "24.7136",
    keyboardType: "decimal-pad",
  },
  {
    key: "longitude",
    label: "Longitude",
    placeholder: "46.6753",
    keyboardType: "decimal-pad",
  },
];

const legalFields: FieldDefinition[] = [
  {
    key: "titleDeedNumber",
    label: "Title Deed Number",
    placeholder: "Enter deed number",
  },
  {
    key: "plotNumber",
    label: "Plot Number",
    placeholder: "Enter plot number",
  },
  {
    key: "planNumber",
    label: "Plan Number",
    placeholder: "Enter plan number",
  },
  {
    key: "parcelNumber",
    label: "Parcel Number",
    placeholder: "Enter parcel number",
  },
  {
    key: "municipality",
    label: "Municipality",
    placeholder: "Enter municipality",
  },
  {
    key: "landUse",
    label: "Approved Land Use",
    type: "select",
    options: LAND_USE_OPTIONS,
  },
  {
    key: "buildingPermitNumber",
    label: "Building Permit Number",
    placeholder: "Enter permit number",
  },
];

const landMeasurementFields: FieldDefinition[] = [
  {
    key: "landArea",
    label: "Land Area",
    placeholder: "Enter land area",
    keyboardType: "decimal-pad",
    suffix: "m²",
    required: true,
  },
  {
    key: "frontageLength",
    label: "Frontage Length",
    placeholder: "Enter frontage length",
    keyboardType: "decimal-pad",
    suffix: "m",
  },
  {
    key: "depth",
    label: "Plot Depth",
    placeholder: "Enter plot depth",
    keyboardType: "decimal-pad",
    suffix: "m",
  },
  {
    key: "streetWidth",
    label: "Street Width",
    placeholder: "Enter street width",
    keyboardType: "decimal-pad",
    suffix: "m",
  },
  {
    key: "numberOfStreetFronts",
    label: "Number of Street Fronts",
    placeholder: "1",
    keyboardType: "numeric",
  },
  {
    key: "isCornerPlot",
    label: "Corner Plot",
    type: "boolean",
  },
  {
    key: "isFenced",
    label: "Land Is Fenced",
    type: "boolean",
  },
  {
    key: "terrainCondition",
    label: "Terrain Condition",
    type: "select",
    options: [
      "Level",
      "Slight Slope",
      "Steep Slope",
      "Rocky",
      "Filled Land",
      "Needs Levelling",
    ],
  },
  {
    key: "plotShape",
    label: "Plot Shape",
    type: "select",
    options: [
      "Regular",
      "Rectangular",
      "Square",
      "Irregular",
      "Triangular",
    ],
  },
];

const utilityFields: FieldDefinition[] = [
  {
    key: "electricityAvailable",
    label: "Electricity Available",
    type: "boolean",
  },
  {
    key: "waterAvailable",
    label: "Water Available",
    type: "boolean",
  },
  {
    key: "sewageAvailable",
    label: "Sewage Available",
    type: "boolean",
  },
  {
    key: "telecomAvailable",
    label: "Telecommunications Available",
    type: "boolean",
  },
  {
    key: "roadAccessAvailable",
    label: "Paved Road Access",
    type: "boolean",
  },
];

const buildingMeasurementFields: FieldDefinition[] = [
  {
    key: "landArea",
    label: "Land Area",
    placeholder: "Enter land area",
    keyboardType: "decimal-pad",
    suffix: "m²",
  },
  {
    key: "builtUpArea",
    label: "Built-up Area",
    placeholder: "Enter built-up area",
    keyboardType: "decimal-pad",
    suffix: "m²",
    required: true,
  },
  {
    key: "propertyAge",
    label: "Property Age",
    placeholder: "Enter age",
    keyboardType: "numeric",
    suffix: "years",
  },
  {
    key: "constructionYear",
    label: "Construction Year",
    placeholder: "Example: 2018",
    keyboardType: "numeric",
  },
  {
    key: "numberOfFloors",
    label: "Number of Floors",
    placeholder: "Enter number of floors",
    keyboardType: "numeric",
  },
  {
    key: "constructionType",
    label: "Construction Type",
    type: "select",
    options: CONSTRUCTION_TYPE_OPTIONS,
  },
  {
    key: "overallCondition",
    label: "Overall Condition",
    type: "select",
    options: CONDITION_OPTIONS,
    required: true,
  },
  {
    key: "occupancyStatus",
    label: "Occupancy Status",
    type: "select",
    options: OCCUPANCY_OPTIONS,
  },
];

const residentialFields: FieldDefinition[] = [
  {
    key: "bedrooms",
    label: "Bedrooms",
    placeholder: "Enter bedroom count",
    keyboardType: "numeric",
  },
  {
    key: "bathrooms",
    label: "Bathrooms",
    placeholder: "Enter bathroom count",
    keyboardType: "numeric",
  },
  {
    key: "livingRooms",
    label: "Living Rooms",
    placeholder: "Enter living room count",
    keyboardType: "numeric",
  },
  {
    key: "majlisCount",
    label: "Majlis",
    placeholder: "Enter majlis count",
    keyboardType: "numeric",
  },
  {
    key: "kitchens",
    label: "Kitchens",
    placeholder: "Enter kitchen count",
    keyboardType: "numeric",
  },
  {
    key: "maidRooms",
    label: "Maid Rooms",
    placeholder: "Enter maid room count",
    keyboardType: "numeric",
  },
  {
    key: "driverRooms",
    label: "Driver Rooms",
    placeholder: "Enter driver room count",
    keyboardType: "numeric",
  },
  {
    key: "parkingSpaces",
    label: "Parking Spaces",
    placeholder: "Enter parking count",
    keyboardType: "numeric",
  },
  {
    key: "hasElevator",
    label: "Elevator Available",
    type: "boolean",
  },
  {
    key: "hasAnnex",
    label: "Annex Available",
    type: "boolean",
  },
  {
    key: "hasBasement",
    label: "Basement Available",
    type: "boolean",
  },
  {
    key: "hasCentralAc",
    label: "Central Air Conditioning",
    type: "boolean",
  },
];

const safetyFields: FieldDefinition[] = [
  {
    key: "fireSafetySystem",
    label: "Fire Safety System",
    type: "select",
    options: FIRE_SYSTEM_OPTIONS,
  },
  {
    key: "emergencyExits",
    label: "Emergency Exits",
    placeholder: "Enter number of exits",
    keyboardType: "numeric",
  },
  {
    key: "civilDefenseApproval",
    label: "Civil Defense Approval Available",
    type: "boolean",
  },
  {
    key: "visibleStructuralCracks",
    label: "Visible Structural Cracks",
    type: "boolean",
  },
  {
    key: "waterLeakageObserved",
    label: "Water Leakage Observed",
    type: "boolean",
  },
];

const PROPERTY_SECTIONS: Record<PropertyType, FormSection[]> = {
  land: [
    {
      title: "Land Measurements",
      fields: landMeasurementFields,
    },
    {
      title: "Utilities and Access",
      fields: utilityFields,
    },
  ],

  property: [
    {
      title: "Property Measurements",
      fields: buildingMeasurementFields,
    },
    {
      title: "Property Details",
      fields: residentialFields,
    },
    {
      title: "Safety Inspection",
      fields: safetyFields,
    },
  ],

  residential_villa: [
    {
      title: "Villa Measurements",
      fields: buildingMeasurementFields,
    },
    {
      title: "Residential Accommodation",
      fields: residentialFields,
    },
    {
      title: "Villa Features",
      fields: [
        {
          key: "villaType",
          label: "Villa Type",
          type: "select",
          options: [
            "Detached Villa",
            "Duplex",
            "Triplex",
            "Townhouse",
            "Compound Villa",
          ],
        },
        {
          key: "hasPrivateYard",
          label: "Private Yard",
          type: "boolean",
        },
        {
          key: "hasSwimmingPool",
          label: "Swimming Pool",
          type: "boolean",
        },
        {
          key: "externalKitchen",
          label: "External Kitchen",
          type: "boolean",
        },
        {
          key: "roofCondition",
          label: "Roof Condition",
          type: "select",
          options: CONDITION_OPTIONS,
        },
      ],
    },
    {
      title: "Safety Inspection",
      fields: safetyFields,
    },
  ],

  building: [
    {
      title: "Building Measurements",
      fields: buildingMeasurementFields,
    },
    {
      title: "Building Units",
      fields: [
        {
          key: "numberOfUnits",
          label: "Total Units",
          placeholder: "Enter number of units",
          keyboardType: "numeric",
        },
        {
          key: "residentialUnits",
          label: "Residential Units",
          placeholder: "Enter residential unit count",
          keyboardType: "numeric",
        },
        {
          key: "commercialUnits",
          label: "Commercial Units",
          placeholder: "Enter commercial unit count",
          keyboardType: "numeric",
        },
        {
          key: "elevators",
          label: "Elevators",
          placeholder: "Enter elevator count",
          keyboardType: "numeric",
        },
        {
          key: "parkingSpaces",
          label: "Parking Spaces",
          placeholder: "Enter parking count",
          keyboardType: "numeric",
        },
      ],
    },
    {
      title: "Safety Inspection",
      fields: safetyFields,
    },
  ],

  rest_house: [
    {
      title: "Rest House Measurements",
      fields: buildingMeasurementFields,
    },
    {
      title: "Accommodation",
      fields: residentialFields,
    },
    {
      title: "Outdoor Features",
      fields: [
        {
          key: "hasSwimmingPool",
          label: "Swimming Pool",
          type: "boolean",
        },
        {
          key: "poolCondition",
          label: "Swimming Pool Condition",
          type: "select",
          options: CONDITION_OPTIONS,
        },
        {
          key: "outdoorSeatingAreas",
          label: "Outdoor Seating Areas",
          placeholder: "Enter number of seating areas",
          keyboardType: "numeric",
        },
        {
          key: "landscapedArea",
          label: "Landscaped Area",
          placeholder: "Enter landscaped area",
          keyboardType: "decimal-pad",
          suffix: "m²",
        },
        {
          key: "hasPlayground",
          label: "Playground Available",
          type: "boolean",
        },
        {
          key: "hasOutdoorKitchen",
          label: "Outdoor Kitchen",
          type: "boolean",
        },
      ],
    },
  ],

  farm_house: [
    {
      title: "Farm Measurements",
      fields: [
        ...landMeasurementFields,
        {
          key: "builtUpArea",
          label: "Built-up Area",
          placeholder: "Enter built-up area",
          keyboardType: "decimal-pad",
          suffix: "m²",
        },
      ],
    },
    {
      title: "Agricultural Details",
      fields: [
        {
          key: "agriculturalArea",
          label: "Agricultural Area",
          placeholder: "Enter agricultural area",
          keyboardType: "decimal-pad",
          suffix: "m²",
        },
        {
          key: "cropType",
          label: "Main Crop Type",
          placeholder: "Example: Dates, vegetables",
        },
        {
          key: "numberOfPalmTrees",
          label: "Number of Palm Trees",
          placeholder: "Enter count",
          keyboardType: "numeric",
        },
        {
          key: "numberOfWells",
          label: "Number of Wells",
          placeholder: "Enter well count",
          keyboardType: "numeric",
        },
        {
          key: "wellLicenseAvailable",
          label: "Well License Available",
          type: "boolean",
        },
        {
          key: "irrigationSystem",
          label: "Irrigation System",
          type: "select",
          options: [
            "None",
            "Manual",
            "Drip Irrigation",
            "Sprinkler",
            "Pivot Irrigation",
          ],
        },
        {
          key: "waterTankCapacity",
          label: "Water Tank Capacity",
          placeholder: "Enter capacity",
          keyboardType: "decimal-pad",
          suffix: "L",
        },
        {
          key: "animalShelters",
          label: "Animal Shelters Available",
          type: "boolean",
        },
      ],
    },
    {
      title: "Farm House Accommodation",
      fields: residentialFields,
    },
  ],

  warehouse: [
    {
      title: "Warehouse Measurements",
      fields: [
        ...buildingMeasurementFields,
        {
          key: "warehouseArea",
          label: "Warehouse Storage Area",
          placeholder: "Enter warehouse area",
          keyboardType: "decimal-pad",
          suffix: "m²",
        },
        {
          key: "ceilingHeight",
          label: "Clear Ceiling Height",
          placeholder: "Enter ceiling height",
          keyboardType: "decimal-pad",
          suffix: "m",
        },
        {
          key: "officeArea",
          label: "Office Area",
          placeholder: "Enter office area",
          keyboardType: "decimal-pad",
          suffix: "m²",
        },
        {
          key: "yardArea",
          label: "External Yard Area",
          placeholder: "Enter yard area",
          keyboardType: "decimal-pad",
          suffix: "m²",
        },
      ],
    },
    {
      title: "Warehouse Operations",
      fields: [
        {
          key: "loadingDocks",
          label: "Loading Docks",
          placeholder: "Enter loading dock count",
          keyboardType: "numeric",
        },
        {
          key: "industrialDoors",
          label: "Industrial Doors",
          placeholder: "Enter door count",
          keyboardType: "numeric",
        },
        {
          key: "floorLoadCondition",
          label: "Floor Condition",
          type: "select",
          options: CONDITION_OPTIONS,
        },
        {
          key: "electricPowerCapacity",
          label: "Electrical Power Capacity",
          placeholder: "Enter power capacity",
          keyboardType: "decimal-pad",
          suffix: "kVA",
        },
        {
          key: "truckAccess",
          label: "Truck Access Available",
          type: "boolean",
        },
        {
          key: "temperatureControlled",
          label: "Temperature Controlled",
          type: "boolean",
        },
        {
          key: "industrialLicenseAvailable",
          label: "Industrial License Available",
          type: "boolean",
        },
      ],
    },
    {
      title: "Safety Inspection",
      fields: safetyFields,
    },
  ],

  shop_floor: [
    {
      title: "Shop Details",
      fields: [
        {
          key: "shopArea",
          label: "Shop Area",
          placeholder: "Enter shop area",
          keyboardType: "decimal-pad",
          suffix: "m²",
          required: true,
        },
        {
          key: "floorNumber",
          label: "Floor Number",
          placeholder: "Example: Ground Floor",
        },
        {
          key: "shopFrontage",
          label: "Shop Frontage",
          placeholder: "Enter frontage",
          keyboardType: "decimal-pad",
          suffix: "m",
        },
        {
          key: "shopDepth",
          label: "Shop Depth",
          placeholder: "Enter depth",
          keyboardType: "decimal-pad",
          suffix: "m",
        },
        {
          key: "numberOfEntrances",
          label: "Number of Entrances",
          placeholder: "Enter entrance count",
          keyboardType: "numeric",
        },
        {
          key: "numberOfDisplayWindows",
          label: "Display Windows",
          placeholder: "Enter display window count",
          keyboardType: "numeric",
        },
        {
          key: "mezzanineAvailable",
          label: "Mezzanine Available",
          type: "boolean",
        },
        {
          key: "shopCondition",
          label: "Shop Condition",
          type: "select",
          options: CONDITION_OPTIONS,
        },
      ],
    },
    {
      title: "Commercial Use",
      fields: [
        {
          key: "currentActivity",
          label: "Current Commercial Activity",
          placeholder: "Example: Retail, restaurant",
        },
        {
          key: "approvedActivity",
          label: "Approved Commercial Activity",
          placeholder: "Enter approved activity",
        },
        {
          key: "commercialLicenseAvailable",
          label: "Commercial License Available",
          type: "boolean",
        },
        {
          key: "signageAvailable",
          label: "Signage Space Available",
          type: "boolean",
        },
        {
          key: "customerParkingAvailable",
          label: "Customer Parking Available",
          type: "boolean",
        },
      ],
    },
    {
      title: "Safety Inspection",
      fields: safetyFields,
    },
  ],

  residential_land: [
    {
      title: "Residential Land Measurements",
      fields: landMeasurementFields,
    },
    {
      title: "Residential Planning",
      fields: [
        {
          key: "permittedFloors",
          label: "Permitted Number of Floors",
          placeholder: "Enter permitted floors",
          keyboardType: "numeric",
        },
        {
          key: "buildingCoverageRatio",
          label: "Building Coverage Ratio",
          placeholder: "Enter percentage",
          keyboardType: "decimal-pad",
          suffix: "%",
        },
        {
          key: "nearbyResidentialDevelopment",
          label: "Nearby Residential Development",
          type: "select",
          options: ["High", "Medium", "Low", "Undeveloped"],
        },
      ],
    },
    {
      title: "Utilities and Access",
      fields: utilityFields,
    },
  ],

  commercial_land: [
    {
      title: "Commercial Land Measurements",
      fields: landMeasurementFields,
    },
    {
      title: "Commercial Planning",
      fields: [
        {
          key: "commercialClassification",
          label: "Commercial Classification",
          placeholder: "Enter commercial classification",
        },
        {
          key: "permittedFloors",
          label: "Permitted Number of Floors",
          placeholder: "Enter permitted floors",
          keyboardType: "numeric",
        },
        {
          key: "buildingCoverageRatio",
          label: "Building Coverage Ratio",
          placeholder: "Enter percentage",
          keyboardType: "decimal-pad",
          suffix: "%",
        },
        {
          key: "commercialFrontage",
          label: "Commercial Frontage",
          placeholder: "Enter frontage",
          keyboardType: "decimal-pad",
          suffix: "m",
        },
        {
          key: "nearMainRoad",
          label: "Located Near Main Road",
          type: "boolean",
        },
        {
          key: "publicParkingNearby",
          label: "Public Parking Nearby",
          type: "boolean",
        },
      ],
    },
    {
      title: "Utilities and Access",
      fields: utilityFields,
    },
  ],

  hotel: [
    {
      title: "Hotel Measurements",
      fields: buildingMeasurementFields,
    },
    {
      title: "Hotel Classification",
      fields: [
        {
          key: "hotelClassification",
          label: "Hotel Classification",
          type: "select",
          options: [
            "Unclassified",
            "1 Star",
            "2 Stars",
            "3 Stars",
            "4 Stars",
            "5 Stars",
            "Hotel Apartments",
            "Boutique Hotel",
          ],
        },
        {
          key: "tourismLicenseAvailable",
          label: "Tourism License Available",
          type: "boolean",
        },
        {
          key: "numberOfRooms",
          label: "Hotel Rooms",
          placeholder: "Enter room count",
          keyboardType: "numeric",
          required: true,
        },
        {
          key: "numberOfSuites",
          label: "Suites",
          placeholder: "Enter suite count",
          keyboardType: "numeric",
        },
        {
          key: "numberOfElevators",
          label: "Elevators",
          placeholder: "Enter elevator count",
          keyboardType: "numeric",
        },
        {
          key: "numberOfRestaurants",
          label: "Restaurants",
          placeholder: "Enter restaurant count",
          keyboardType: "numeric",
        },
        {
          key: "numberOfConferenceRooms",
          label: "Conference Rooms",
          placeholder: "Enter conference room count",
          keyboardType: "numeric",
        },
        {
          key: "numberOfParkingSpaces",
          label: "Parking Spaces",
          placeholder: "Enter parking count",
          keyboardType: "numeric",
        },
      ],
    },
    {
      title: "Hotel Facilities",
      fields: [
        {
          key: "receptionAvailable",
          label: "Reception Area",
          type: "boolean",
        },
        {
          key: "commercialKitchenAvailable",
          label: "Commercial Kitchen",
          type: "boolean",
        },
        {
          key: "gymAvailable",
          label: "Gym Available",
          type: "boolean",
        },
        {
          key: "swimmingPoolAvailable",
          label: "Swimming Pool",
          type: "boolean",
        },
        {
          key: "laundryFacilityAvailable",
          label: "Laundry Facility",
          type: "boolean",
        },
        {
          key: "centralAcAvailable",
          label: "Central Air Conditioning",
          type: "boolean",
        },
      ],
    },
    {
      title: "Safety Inspection",
      fields: safetyFields,
    },
  ],

  commercial_building: [
    {
      title: "Commercial Building Measurements",
      fields: buildingMeasurementFields,
    },
    {
      title: "Commercial Units",
      fields: [
        {
          key: "numberOfOffices",
          label: "Office Units",
          placeholder: "Enter office count",
          keyboardType: "numeric",
        },
        {
          key: "numberOfShops",
          label: "Retail Shops",
          placeholder: "Enter shop count",
          keyboardType: "numeric",
        },
        {
          key: "numberOfShowrooms",
          label: "Showrooms",
          placeholder: "Enter showroom count",
          keyboardType: "numeric",
        },
        {
          key: "numberOfElevators",
          label: "Elevators",
          placeholder: "Enter elevator count",
          keyboardType: "numeric",
        },
        {
          key: "parkingSpaces",
          label: "Parking Spaces",
          placeholder: "Enter parking count",
          keyboardType: "numeric",
        },
        {
          key: "basementParking",
          label: "Basement Parking",
          type: "boolean",
        },
        {
          key: "centralAcAvailable",
          label: "Central Air Conditioning",
          type: "boolean",
        },
      ],
    },
    {
      title: "Commercial Compliance",
      fields: [
        {
          key: "commercialLicenseAvailable",
          label: "Commercial License Available",
          type: "boolean",
        },
        {
          key: "civilDefenseApproval",
          label: "Civil Defense Approval",
          type: "boolean",
        },
        {
          key: "disabledAccessAvailable",
          label: "Accessible Entrance Available",
          type: "boolean",
        },
      ],
    },
    {
      title: "Safety Inspection",
      fields: safetyFields,
    },
  ],

  residential_building: [
    {
      title: "Residential Building Measurements",
      fields: buildingMeasurementFields,
    },
    {
      title: "Residential Units",
      fields: [
        {
          key: "numberOfApartments",
          label: "Number of Apartments",
          placeholder: "Enter apartment count",
          keyboardType: "numeric",
          required: true,
        },
        {
          key: "averageApartmentArea",
          label: "Average Apartment Area",
          placeholder: "Enter average area",
          keyboardType: "decimal-pad",
          suffix: "m²",
        },
        {
          key: "numberOfElevators",
          label: "Elevators",
          placeholder: "Enter elevator count",
          keyboardType: "numeric",
        },
        {
          key: "parkingSpaces",
          label: "Parking Spaces",
          placeholder: "Enter parking count",
          keyboardType: "numeric",
        },
        {
          key: "driverRooms",
          label: "Driver Rooms",
          placeholder: "Enter driver room count",
          keyboardType: "numeric",
        },
        {
          key: "sharedRoofArea",
          label: "Shared Roof Area",
          type: "boolean",
        },
        {
          key: "separateMeters",
          label: "Separate Utility Meters",
          type: "boolean",
        },
      ],
    },
    {
      title: "Common Areas",
      fields: [
        {
          key: "entranceCondition",
          label: "Entrance Condition",
          type: "select",
          options: CONDITION_OPTIONS,
        },
        {
          key: "staircaseCondition",
          label: "Staircase Condition",
          type: "select",
          options: CONDITION_OPTIONS,
        },
        {
          key: "elevatorCondition",
          label: "Elevator Condition",
          type: "select",
          options: CONDITION_OPTIONS,
        },
        {
          key: "commonAreaCleanliness",
          label: "Common Area Cleanliness",
          type: "select",
          options: CONDITION_OPTIONS,
        },
      ],
    },
    {
      title: "Safety Inspection",
      fields: safetyFields,
    },
  ],
};

const inspectionSummaryFields: FieldDefinition[] = [
  {
    key: "maintenanceRequired",
    label: "Maintenance Required",
    type: "boolean",
  },
  {
    key: "estimatedMaintenanceCost",
    label: "Estimated Maintenance Cost",
    placeholder: "Enter approximate amount",
    keyboardType: "decimal-pad",
    suffix: "SAR",
  },
  {
    key: "inspectionResult",
    label: "Inspection Result",
    type: "select",
    options: [
      "Acceptable",
      "Acceptable with Minor Repairs",
      "Requires Maintenance",
      "Requires Major Renovation",
      "Unsafe",
      "Further Specialist Inspection Required",
    ],
    required: true,
  },
  {
    key: "inspectorNotes",
    label: "Inspector Notes",
    placeholder:
      "Record defects, observations, access restrictions and recommendations...",
    multiline: true,
  },
];

export default function PropertyInspectionForm({
  initialValues = {},
  initialPropertyType = null,
  onChange,
  onSubmit,
  submitLabel = "Save Property Inspection",
}: PropertyInspectionFormProps) {
  const [propertyType, setPropertyType] =
    useState<PropertyType | null>(initialPropertyType);

  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [propertyTypeModalVisible, setPropertyTypeModalVisible] =
    useState(false);

  const [fieldSelect, setFieldSelect] = useState<{
    visible: boolean;
    field: FieldDefinition | null;
  }>({
    visible: false,
    field: null,
  });

  const selectedPropertyLabel = useMemo(() => {
    return (
      PROPERTY_TYPES.find((item) => item.value === propertyType)?.label ?? ""
    );
  }, [propertyType]);

  const sections = useMemo<FormSection[]>(() => {
    if (!propertyType) return [];

    return [
      {
        title: "Location and Identification",
        description: "General property location and inspection reference data.",
        fields: commonLocationFields,
      },
      {
        title: "Legal and Planning Information",
        description:
          "Record available documents only. Do not confirm legal validity unless verified.",
        fields: legalFields,
      },
      ...PROPERTY_SECTIONS[propertyType],
      {
        title: "Inspection Summary",
        description:
          "Provide the inspector's final condition assessment and recommendations.",
        fields: inspectionSummaryFields,
      },
    ];
  }, [propertyType]);

  function updateValue(key: string, value: string | boolean) {
    const nextValues = {
      ...values,
      [key]: value,
    };

    setValues(nextValues);

    if (errors[key]) {
      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[key];
        return nextErrors;
      });
    }

    onChange?.(nextValues, propertyType);
  }

  function selectPropertyType(nextType: PropertyType) {
    setPropertyType(nextType);
    setPropertyTypeModalVisible(false);
    setErrors({});
    onChange?.(values, nextType);
  }

  function openFieldSelect(field: FieldDefinition) {
    setFieldSelect({
      visible: true,
      field,
    });
  }

  function closeFieldSelect() {
    setFieldSelect({
      visible: false,
      field: null,
    });
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (!field.required) return;

        const value = values[field.key];

        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && !value.trim())
        ) {
          nextErrors[field.key] = `${field.label} is required.`;
        }
      });
    });

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (!propertyType) return;

    if (!validateForm()) {
      return;
    }

    onSubmit?.(values, propertyType);
  }

  function renderField(field: FieldDefinition) {
    const value = values[field.key];
    const error = errors[field.key];

    if (field.type === "boolean") {
      return (
        <View key={field.key} style={styles.booleanWrapper}>
          <View style={styles.booleanTextContainer}>
            <Text style={styles.booleanLabel}>{field.label}</Text>
            <Text style={styles.booleanStatus}>
              {Boolean(value) ? "Yes" : "No"}
            </Text>
          </View>

          <Switch
            value={Boolean(value)}
            onValueChange={(nextValue) =>
              updateValue(field.key, nextValue)
            }
            trackColor={{
              false: BORDER,
              true: SOFT,
            }}
            thumbColor={Boolean(value) ? ACC : "#FFFFFF"}
          />
        </View>
      );
    }

    if (field.type === "select") {
      return (
        <View key={field.key} style={styles.fieldWrapper}>
          <Text style={styles.label}>
            {field.label}
            {field.required ? (
              <Text style={styles.required}> *</Text>
            ) : null}
          </Text>

          <Pressable
            style={[
              styles.selectInput,
              error ? styles.inputError : null,
            ]}
            onPress={() => openFieldSelect(field)}
          >
            <Text
              style={[
                styles.selectValue,
                !value ? styles.placeholderText : null,
              ]}
            >
              {typeof value === "string" && value
                ? value
                : `Select ${field.label.toLowerCase()}`}
            </Text>

            <Text style={styles.chevron}>⌄</Text>
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      );
    }

    return (
      <View key={field.key} style={styles.fieldWrapper}>
        <Text style={styles.label}>
          {field.label}
          {field.required ? (
            <Text style={styles.required}> *</Text>
          ) : null}
        </Text>

        <View
          style={[
            styles.textInputContainer,
            field.multiline ? styles.multilineContainer : null,
            error ? styles.inputError : null,
          ]}
        >
          <TextInput
            value={typeof value === "string" ? value : ""}
            onChangeText={(text) => updateValue(field.key, text)}
            placeholder={field.placeholder}
            placeholderTextColor={MUTED}
            keyboardType={field.keyboardType ?? "default"}
            multiline={field.multiline}
            textAlignVertical={field.multiline ? "top" : "center"}
            style={[
              styles.textInput,
              field.multiline ? styles.multilineInput : null,
            ]}
          />

          {field.suffix ? (
            <Text style={styles.inputSuffix}>{field.suffix}</Text>
          ) : null}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>⌂</Text>
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Property Inspection</Text>
            <Text style={styles.subtitle}>
              Record the physical condition, measurements and available
              property documentation.
            </Text>
          </View>
        </View>

        <View style={styles.propertyTypeCard}>
          <Text style={styles.sectionLabel}>Property Type</Text>

          <Pressable
            style={styles.propertyTypeSelect}
            onPress={() => setPropertyTypeModalVisible(true)}
          >
            <View style={styles.propertyTypeTextContainer}>
              <Text
                style={[
                  styles.propertyTypeValue,
                  !propertyType ? styles.placeholderText : null,
                ]}
              >
                {selectedPropertyLabel || "Select property type"}
              </Text>

              {propertyType ? (
                <Text style={styles.propertyTypeHint}>
                  Form fields are adjusted for this property type.
                </Text>
              ) : null}
            </View>

            <Text style={styles.chevron}>⌄</Text>
          </Pressable>
        </View>

        {!propertyType ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Text style={styles.emptyStateIconText}>⌂</Text>
            </View>

            <Text style={styles.emptyStateTitle}>
              Select a property type
            </Text>

            <Text style={styles.emptyStateText}>
              The appropriate inspection fields will appear after you
              select the property category.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.selectedTypeBanner}>
              <View style={styles.selectedTypeBadge}>
                <Text style={styles.selectedTypeBadgeText}>
                  {selectedPropertyLabel}
                </Text>
              </View>

              <Text style={styles.selectedTypeBannerText}>
                Inspection form configured
              </Text>
            </View>

            {sections.map((section, sectionIndex) => (
              <View
                key={`${section.title}-${sectionIndex}`}
                style={styles.sectionCard}
              >
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionNumber}>
                    <Text style={styles.sectionNumberText}>
                      {sectionIndex + 1}
                    </Text>
                  </View>

                  <View style={styles.sectionHeadingContainer}>
                    <Text style={styles.sectionTitle}>
                      {section.title}
                    </Text>

                    {section.description ? (
                      <Text style={styles.sectionDescription}>
                        {section.description}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.fieldsContainer}>
                  {section.fields.map(renderField)}
                </View>
              </View>
            ))}

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>
                {submitLabel}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal
        visible={propertyTypeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPropertyTypeModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPropertyTypeModalVisible(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Property Type</Text>
                <Text style={styles.modalSubtitle}>
                  Select the inspected property category
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setPropertyTypeModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalOptionsScroll}
              showsVerticalScrollIndicator={false}
            >
              {PROPERTY_TYPES.map((item) => {
                const selected = propertyType === item.value;

                return (
                  <TouchableOpacity
                    key={item.value}
                    activeOpacity={0.75}
                    style={[
                      styles.modalOption,
                      selected ? styles.modalOptionSelected : null,
                    ]}
                    onPress={() => selectPropertyType(item.value)}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        selected ? styles.radioOuterSelected : null,
                      ]}
                    >
                      {selected ? (
                        <View style={styles.radioInner} />
                      ) : null}
                    </View>

                    <Text
                      style={[
                        styles.modalOptionText,
                        selected
                          ? styles.modalOptionTextSelected
                          : null,
                      ]}
                    >
                      {item.label}
                    </Text>

                    {selected ? (
                      <Text style={styles.selectedCheck}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={fieldSelect.visible}
        transparent
        animationType="fade"
        onRequestClose={closeFieldSelect}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={closeFieldSelect}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.fieldModalHeading}>
                <Text style={styles.modalTitle}>
                  {fieldSelect.field?.label}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Select one option
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeFieldSelect}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalOptionsScroll}
              showsVerticalScrollIndicator={false}
            >
              {fieldSelect.field?.options?.map((option) => {
                const selected =
                  values[fieldSelect.field?.key ?? ""] === option;

                return (
                  <TouchableOpacity
                    key={option}
                    activeOpacity={0.75}
                    style={[
                      styles.modalOption,
                      selected ? styles.modalOptionSelected : null,
                    ]}
                    onPress={() => {
                      if (!fieldSelect.field) return;

                      updateValue(fieldSelect.field.key, option);
                      closeFieldSelect();
                    }}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        selected ? styles.radioOuterSelected : null,
                      ]}
                    >
                      {selected ? (
                        <View style={styles.radioInner} />
                      ) : null}
                    </View>

                    <Text
                      style={[
                        styles.modalOptionText,
                        selected
                          ? styles.modalOptionTextSelected
                          : null,
                      ]}
                    >
                      {option}
                    </Text>

                    {selected ? (
                      <Text style={styles.selectedCheck}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 50,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerIconText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "800",
  },

  subtitle: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },

  propertyTypeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
    marginBottom: 14,
  },

  sectionLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 9,
  },

  propertyTypeSelect: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    backgroundColor: "#FBFCFE",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  propertyTypeTextContainer: {
    flex: 1,
  },

  propertyTypeValue: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },

  propertyTypeHint: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3,
  },

  chevron: {
    color: ACC,
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 10,
  },

  placeholderText: {
    color: MUTED,
    fontWeight: "400",
  },

  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
  },

  emptyStateIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyStateIconText: {
    color: ACC,
    fontSize: 30,
    fontWeight: "800",
  },

  emptyStateTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 7,
  },

  emptyStateText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  selectedTypeBanner: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: SURFACE,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 14,
  },

  selectedTypeBadge: {
    backgroundColor: ACC,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  selectedTypeBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  selectedTypeBannerText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 10,
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
    marginBottom: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: SURFACE,
    marginBottom: 15,
  },

  sectionNumber: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sectionNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  sectionHeadingContainer: {
    flex: 1,
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
  },

  sectionDescription: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },

  fieldsContainer: {
    gap: 14,
  },

  fieldWrapper: {
    width: "100%",
  },

  label: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },

  required: {
    color: "#C0392B",
  },

  textInputContainer: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBFCFE",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  textInput: {
    flex: 1,
    minHeight: 46,
    color: TEXT,
    fontSize: 14,
    paddingVertical: 0,
  },

  multilineContainer: {
    minHeight: 115,
    alignItems: "flex-start",
  },

  multilineInput: {
    minHeight: 110,
    paddingTop: 12,
    paddingBottom: 12,
  },

  inputSuffix: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
  },

  selectInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBFCFE",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  selectValue: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    fontWeight: "600",
  },

  inputError: {
    borderColor: "#C0392B",
  },

  errorText: {
    color: "#C0392B",
    fontSize: 11,
    marginTop: 5,
  },

  booleanWrapper: {
    minHeight: 60,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBFCFE",
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  booleanTextContainer: {
    flex: 1,
    paddingRight: 10,
  },

  booleanLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  booleanStatus: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3,
  },

  submitButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(42, 50, 75, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },

  modalCard: {
    width: "100%",
    maxHeight: "82%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: SURFACE,
  },

  fieldModalHeading: {
    flex: 1,
  },

  modalTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "800",
  },

  modalSubtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  closeButtonText: {
    color: ACC,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "500",
  },

  modalOptionsScroll: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },

  modalOption: {
    minHeight: 54,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 13,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  modalOptionSelected: {
    borderColor: ACC,
    backgroundColor: SURFACE,
  },

  modalOptionText: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    fontWeight: "600",
  },

  modalOptionTextSelected: {
    color: ACC,
    fontWeight: "800",
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  radioOuterSelected: {
    borderColor: ACC,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACC,
  },

  selectedCheck: {
    color: ACC,
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8,
  },
});