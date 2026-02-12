'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/* =========================
   Types
========================= */

type Karat = '18K' | '22K' | '24K' | 'SILVER'

const allowedKarats: readonly Karat[] = [
  '18K',
  '22K',
  '24K',
  'SILVER',
]

function isValidKarat(value: string): value is Karat {
  return allowedKarats.includes(value as Karat)
}

interface PulseClientProps {
  initialMetrics: any
}

/* =========================
   Component
========================= */

export function PulseClient({ initialMetrics }: PulseClientProps) {
  const router = useRouter()

  const [metrics] = useState(initialMetrics || {})
  const [updateRateDialog, setUpdateRateDialog] = useState(false)
  const [newRate, setNewRate] = useState('')
  const [selectedKarat, setSelectedKarat] = useState<Karat>('22K')
  const [updating, setUpdating] = useState(false)

  async function handleUpdateRate() {
    if (!newRate) return

    const parsed = Number(newRate)
    if (!Number.isFinite(parsed) || parsed <= 0) return

    try {
      setUpdating(true)

      const { error } = await supabase.from('gold_rates').insert({
        karat: selectedKarat,
        rate_per_gram: parsed,
      })

      if (error) throw error

      setUpdateRateDialog(false)
      setNewRate('')
      router.refresh()
    } catch (err) {
      console.error('Rate update failed:', err)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Example Metrics Card */}
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">
            Pulse dashboard loaded successfully.
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => setUpdateRateDialog(true)}>
        Update Gold Rate
      </Button>

      <Dialog open={updateRateDialog} onOpenChange={setUpdateRateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Gold Rate</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Karat</Label>
              <Select
                value={selectedKarat}
                onValueChange={(v) => {
                  if (isValidKarat(v)) setSelectedKarat(v)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedKarats.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rate per gram (₹)</Label>
              <Input
                type="number"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                step="0.01"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setUpdateRateDialog(false)}
                disabled={updating}
              >
                Cancel
              </Button>

              <Button
                className="flex-1"
                onClick={handleUpdateRate}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
