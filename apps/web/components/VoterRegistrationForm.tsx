"use client";

import { useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Import from zod/v3 subpath — the main "zod" export in 3.25.x resolves to v4 API.
import { z } from "zod/v3";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { trpc } from "@/lib/trpc";

// OMB Statistical Policy Directive 15 (SPD-15, updated March 2024)
const RACE_ETHNICITY_OPTIONS = [
  { value: "white", label: "White" },
  { value: "black_african_american", label: "Black or African American" },
  { value: "american_indian_alaska_native", label: "American Indian or Alaska Native" },
  { value: "asian", label: "Asian" },
  { value: "native_hawaiian_pacific_islander", label: "Native Hawaiian or Pacific Islander" },
  { value: "middle_eastern_north_african", label: "Middle Eastern or North African" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

type RaceEthnicityValue = (typeof RACE_ETHNICITY_OPTIONS)[number]["value"];
// Tuple cast required by z.enum — same values, typed as non-empty tuple.
const RACE_ETHNICITY_VALUES = RACE_ETHNICITY_OPTIONS.map((o) => o.value) as [
  RaceEthnicityValue,
  ...RaceEthnicityValue[],
];

const schema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").or(z.literal("")).optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  raceEthnicityCategories: z
    .array(z.enum(RACE_ETHNICITY_VALUES))
    .min(1, "Please select at least one option")
    .refine((cats) => !(cats.includes("prefer_not_to_say") && cats.length > 1), {
      message: '"Prefer not to say" cannot be combined with other selections.',
    }),
  affiliationIds: z.array(z.string()),
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must consent to continue" }),
  }),
});

type FormValues = z.infer<typeof schema>;

interface VoterRegistrationFormProps {
  ballotId: string;
  onSuccess: () => void;
}

export function VoterRegistrationForm({ ballotId, onSuccess }: VoterRegistrationFormProps) {
  const addressInputRef = useRef<HTMLInputElement>(null);
  const { data: affiliationsList, isLoading: affiliationsLoading } =
    trpc.affiliations.listForBallot.useQuery({ ballotId });

  const registerMutation = trpc.voters.register.useMutation({
    onSuccess: () => onSuccess(),
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      raceEthnicityCategories: [],
      affiliationIds: [],
    },
  });

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !addressInputRef.current) return;

    const inputEl = addressInputRef.current;
    let autocomplete: google.maps.places.Autocomplete | undefined;

    setOptions({ key: apiKey, v: "weekly" });

    importLibrary("places")
      .then((places) => {
        const { Autocomplete } = places as google.maps.PlacesLibrary;
        autocomplete = new Autocomplete(inputEl, {
          types: ["address"],
          componentRestrictions: { country: "us" },
          fields: ["address_components"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete!.getPlace();
          if (!place.address_components) return;

          let streetNumber = "";
          let route = "";
          let city = "";
          let state = "";
          let zip = "";

          for (const component of place.address_components) {
            const type = component.types[0];
            if (type === "street_number") streetNumber = component.long_name;
            if (type === "route") route = component.long_name;
            if (type === "locality") city = component.long_name;
            if (type === "administrative_area_level_1") state = component.short_name;
            if (type === "postal_code") zip = component.long_name;
          }

          const street = [streetNumber, route].filter(Boolean).join(" ");
          setValue("addressStreet", street);
          setValue("addressCity", city);
          setValue("addressState", state);
          setValue("addressZip", zip);
          inputEl.value = street;
        });
      })
      .catch(() => {
        // Google Maps unavailable — address field works as plain text input
      });

    return () => {
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [setValue]);

  async function onSubmit(values: FormValues) {
    await registerMutation.mutateAsync({
      ballotId,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email || undefined,
      addressStreet: values.addressStreet,
      addressCity: values.addressCity,
      addressState: values.addressState,
      addressZip: values.addressZip,
      raceEthnicityCategories: values.raceEthnicityCategories,
      affiliationIds: values.affiliationIds,
      consentedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
      <div className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Voter Registration</h2>
        <p className="text-sm text-gray-600 mb-8">
          Your information is kept confidential. Results are shared in aggregate only.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3" id="name-group">
              Name
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="sr-only">
                  First name
                </label>
                <input
                  {...register("firstName")}
                  id="firstName"
                  placeholder="First name"
                  aria-describedby={errors.firstName ? "firstName-error" : undefined}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.firstName && (
                  <p id="firstName-error" className="text-xs text-red-600 mt-1">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="sr-only">
                  Last name
                </label>
                <input
                  {...register("lastName")}
                  id="lastName"
                  placeholder="Last name"
                  aria-describedby={errors.lastName ? "lastName-error" : undefined}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.lastName && (
                  <p id="lastName-error" className="text-xs text-red-600 mt-1">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <input
              {...register("email")}
              id="email"
              type="email"
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
              Address <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <input
              ref={addressInputRef}
              id="address"
              placeholder="Start typing your address…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Hidden structured fields populated by Places Autocomplete */}
            <input type="hidden" {...register("addressStreet")} />
            <input type="hidden" {...register("addressCity")} />
            <input type="hidden" {...register("addressState")} />
            <input type="hidden" {...register("addressZip")} />
          </div>

          {/* Race / Ethnicity */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-1">Race / Ethnicity</legend>
            <p className="text-xs text-gray-500 mb-3">
              Select all that apply. &ldquo;Prefer not to say&rdquo; is mutually exclusive.
            </p>
            <Controller
              name="raceEthnicityCategories"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  {RACE_ETHNICITY_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={field.value.includes(option.value)}
                        onChange={(e) => {
                          if (option.value === "prefer_not_to_say") {
                            field.onChange(e.target.checked ? ["prefer_not_to_say"] : []);
                          } else if (e.target.checked) {
                            field.onChange([
                              ...field.value.filter((v) => v !== "prefer_not_to_say"),
                              option.value,
                            ]);
                          } else {
                            field.onChange(field.value.filter((v) => v !== option.value));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.raceEthnicityCategories && (
              <p className="text-xs text-red-600 mt-2">{errors.raceEthnicityCategories.message}</p>
            )}
          </fieldset>

          {/* Community & Political Groups — hidden if campaign has none configured */}
          {!affiliationsLoading && (affiliationsList?.length ?? 0) > 0 && (
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 mb-1">
                Community & Political Groups{" "}
                <span className="font-normal text-gray-500">(optional)</span>
              </legend>
              <p className="text-xs text-gray-500 mb-3">Select all that apply.</p>
              <Controller
                name="affiliationIds"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    {affiliationsList!.map((aff) => (
                      <label key={aff.id} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          value={aff.id}
                          checked={field.value.includes(aff.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              field.onChange([...field.value, aff.id]);
                            } else {
                              field.onChange(field.value.filter((v) => v !== aff.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{aff.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
            </fieldset>
          )}

          {/* Consent */}
          <div className="border-t border-gray-100 pt-5">
            <Controller
              name="consent"
              control={control}
              render={({ field }) => (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={(e) =>
                      field.onChange(e.target.checked ? true : (undefined as unknown as true))
                    }
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                  />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I consent to the collection of my demographic information for aggregated
                    research purposes. My individual responses will never be made public.
                  </span>
                </label>
              )}
            />
            {errors.consent && (
              <p className="text-xs text-red-600 mt-2">{errors.consent.message}</p>
            )}
          </div>

          {registerMutation.error && (
            <p className="text-xs text-red-600">{registerMutation.error.message}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || registerMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {registerMutation.isPending ? "Registering…" : "Continue to Ballot"}
          </button>
        </form>
      </div>
    </div>
  );
}
