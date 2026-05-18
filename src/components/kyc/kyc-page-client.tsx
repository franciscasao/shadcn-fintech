"use client"

import { useState, useCallback } from "react"
import { AnimatePresence } from "motion/react"
import { ShieldCheckIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { KycStepper } from "@/components/kyc/kyc-stepper"
import { IntroStep } from "@/components/kyc/steps/intro-step"
import { PersonalStep } from "@/components/kyc/steps/personal-step"
import { AddressStep } from "@/components/kyc/steps/address-step"
import { DocumentStep } from "@/components/kyc/steps/document-step"
import { SelfieStep } from "@/components/kyc/steps/selfie-step"
import { ReviewStep } from "@/components/kyc/steps/review-step"
import { SuccessStep } from "@/components/kyc/steps/success-step"

export type KycStep =
  | "intro"
  | "personal"
  | "address"
  | "document"
  | "selfie"
  | "review"
  | "success"

export type DocSide = "front" | "back"

export type KycData = {
  fullName: string
  dob: string
  nationality: string
  residence: string
  street: string
  city: string
  state: string
  postal: string
  country: string
  docType: "passport" | "driver-license" | "national-id"
  docFront: { name: string; uploaded: boolean }
  docBack: { name: string; uploaded: boolean }
  selfieCaptured: boolean
}

const initialData: KycData = {
  fullName: "",
  dob: "",
  nationality: "",
  residence: "",
  street: "",
  city: "",
  state: "",
  postal: "",
  country: "",
  docType: "passport",
  docFront: { name: "", uploaded: false },
  docBack: { name: "", uploaded: false },
  selfieCaptured: false,
}

export const KYC_STATUS_KEY = "vault-kyc-status"
export const KYC_SUBMITTED_AT_KEY = "vault-kyc-submitted-at"

const stepperSteps = [
  { id: "personal", label: "Personal" },
  { id: "address", label: "Address" },
  { id: "document", label: "ID" },
  { id: "selfie", label: "Selfie" },
  { id: "review", label: "Review" },
]

export function KycPageClient() {
  const [step, setStep] = useState<KycStep>(() => {
    if (typeof window === "undefined") return "intro"
    const status = localStorage.getItem(KYC_STATUS_KEY)
    return status === "submitted" ? "success" : "intro"
  })
  const [data, setData] = useState<KycData>(initialData)

  const updateData = useCallback((patch: Partial<KycData>) => {
    setData((prev) => ({ ...prev, ...patch }))
  }, [])

  function submit() {
    try {
      localStorage.setItem(KYC_STATUS_KEY, "submitted")
      localStorage.setItem(KYC_SUBMITTED_AT_KEY, new Date().toISOString())
    } catch {
      // ignore
    }
    setStep("success")
  }

  const showStepper = step !== "intro" && step !== "success"

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Eyebrow */}
      {showStepper && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-3.5" />
          <span>Identity verification</span>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          {showStepper && (
            <div className="mb-6">
              <KycStepper steps={stepperSteps} current={step} />
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "intro" && (
              <IntroStep key="intro" onStart={() => setStep("personal")} />
            )}
            {step === "personal" && (
              <PersonalStep
                key="personal"
                data={data}
                onChange={updateData}
                onBack={() => setStep("intro")}
                onNext={() => setStep("address")}
              />
            )}
            {step === "address" && (
              <AddressStep
                key="address"
                data={data}
                onChange={updateData}
                onBack={() => setStep("personal")}
                onNext={() => setStep("document")}
              />
            )}
            {step === "document" && (
              <DocumentStep
                key="document"
                data={data}
                onChange={updateData}
                onBack={() => setStep("address")}
                onNext={() => setStep("selfie")}
              />
            )}
            {step === "selfie" && (
              <SelfieStep
                key="selfie"
                data={data}
                onChange={updateData}
                onBack={() => setStep("document")}
                onNext={() => setStep("review")}
              />
            )}
            {step === "review" && (
              <ReviewStep
                key="review"
                data={data}
                onBack={() => setStep("selfie")}
                onJump={setStep}
                onSubmit={submit}
              />
            )}
            {step === "success" && <SuccessStep key="success" />}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}
