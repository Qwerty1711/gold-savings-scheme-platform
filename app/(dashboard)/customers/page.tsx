
import CustomersClient from './CustomersClient';
import { supabase } from '@/lib/supabase/client';

export default async function CustomersPage() {
  // Fetch customers data here if needed
  let customers = [];
  let loading = false;
  // Optionally: fetch data from supabase
  return <CustomersClient customers={customers} loading={loading} />;
}
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customerId={selectedCustomerId}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedCustomerId(null);
        }}
      />
    </div>
  );
}
