'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export default function CreateOfferPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    title: '',
    productId: '',
    originalPrice: 0,
    offerPrice: 0,
    quantity: 1,
  })

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      // TODO: Submit offer
      router.push('/dashboard/merchant/offers')
    }
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 flex justify-center py-8 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-[800px] flex flex-col gap-6">
            {/* Glass Container */}
            <Card className="glass-panel rounded-3xl p-8 sm:p-10">
              {/* Header */}
              <div className="flex flex-col gap-4 mb-8">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <h1 className="text-3xl sm:text-4xl font-black text-text-primary dark:text-white">
                      Create Exclusive Offer
                    </h1>
                    <p className="text-base font-medium text-[#9e5e47] dark:text-[#d4a896]">
                      Verified Local Store Portal
                    </p>
                  </div>
                  <button className="rounded-full w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-text-primary dark:text-white">close</span>
                  </button>
                </div>

                {/* Stepper */}
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-primary">Step {step}: {step === 1 ? 'Basic Details' : step === 2 ? 'Advanced Details' : 'Review'}</span>
                    <span className="text-gray-400 dark:text-gray-500">Step 3: Review</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(250,108,56,0.5)] transition-all"
                      style={{ width: `${(step / 3) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Form Content - Step 1 */}
              {step === 1 && (
                <div className="flex flex-col gap-8">
                  {/* Offer Title */}
                  <div className="relative group">
                    <Input
                      className="peer block w-full rounded-xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 px-4 pt-6 pb-2 text-lg font-medium focus:border-primary"
                      placeholder=" "
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <Label className="absolute left-4 top-4 origin-[0] -translate-y-4 scale-75 transform text-gray-500 duration-200 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-primary">
                      Offer Title
                    </Label>
                  </div>

                  {/* Product Selection */}
                  <div className="flex flex-col gap-4">
                    <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Inventory Selection
                    </p>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                      <Input
                        className="w-full rounded-xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 pl-12 pr-4 py-4"
                        placeholder="Search your inventory..."
                      />
                    </div>

                    {/* Selected Product Card */}
                    <Card className="relative overflow-hidden rounded-2xl border border-primary/20 bg-white/60 dark:bg-white/5 p-4">
                      <div className="flex flex-col sm:flex-row gap-5">
                        <div className="relative w-full sm:w-32 aspect-[3/4] rounded-lg overflow-hidden bg-gray-200">
                          <img
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoo-ciVjnvYxkxUUIc1A3Jl34_E_mFBpLeO0vQSbnnahTHvR58UeyJxCgE7rV0xLBYz4vjuCcUXhqlpgo5yiB1MVi-MEWqouVapmppAhgtLFE4KX4OUGRp3Y9W_26WKBuk2Cv4i5bpeKTYrsyp3wjNlNCIXcJXbyuCYu_98pG1E_8flNZzUfAsB9-9BmpIGHqwMCO2JX3_e9m-ITIFWJ7K_cUfMRrDh0n4i9aqEtQ6u7vlSDRdzimefs9vyq15dYmLdLRWQAW0fmSl"
                            alt="Product"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col justify-center flex-1 gap-1">
                          <div className="flex gap-2 mb-1">
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-medium">
                              In Stock: 5
                            </span>
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">
                              Near Mint
                            </span>
                          </div>
                          <h3 className="text-xl font-bold">Charizard VMAX</h3>
                          <p className="text-sm font-medium text-[#9e5e47] dark:text-[#d4a896]">
                            Darkness Ablaze • 020/189
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Price & Quantity */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-4 flex flex-col gap-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Original Price
                      </Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                        <Input
                          className="w-full rounded-xl bg-gray-50 dark:bg-white/5 pl-8 pr-4 py-4 text-lg font-medium"
                          type="number"
                          value={formData.originalPrice}
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="md:col-span-5 flex flex-col gap-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-primary flex justify-between">
                        Exclusive Price
                        <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold">-21% OFF</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-xl">€</span>
                        <Input
                          className="w-full rounded-xl border-primary/30 bg-white dark:bg-black/40 pl-9 pr-4 py-4 text-2xl font-bold text-primary focus:border-primary focus:ring-4 focus:ring-primary/10"
                          type="number"
                          value={formData.offerPrice}
                          onChange={(e) => setFormData({ ...formData, offerPrice: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-3 flex flex-col gap-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Quantity
                      </Label>
                      <div className="relative flex items-center">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                          className="absolute left-2 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20"
                        >
                          <span className="material-symbols-outlined text-base">remove</span>
                        </button>
                        <Input
                          className="w-full rounded-xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 px-10 py-4 text-center text-lg font-medium"
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                          className="absolute right-2 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20"
                        >
                          <span className="material-symbols-outlined text-base">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 & 3 placeholder */}
              {step > 1 && (
                <div className="flex flex-col gap-8">
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    Step {step} content - da implementare
                  </p>
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-6 border-t border-gray-200/50 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="text-gray-500 dark:text-gray-400 font-medium hover:text-text-primary dark:hover:text-white transition-colors px-4 py-2"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleNext}
                  className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group"
                >
                  {step === 3 ? 'Create Offer' : 'Next Step'}
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

