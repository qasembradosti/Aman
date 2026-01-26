import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  fetchWithdrawalRequests,
  approveWithdrawal,
  rejectWithdrawal,
  deleteWithdrawal,
} from "../../store/slices/withdrawalsSlice";
import {
  Loader2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Trash2,
  DollarSign,
  User,
  Calendar,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

const statusColors = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const Withdrawals = () => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.withdrawals);

  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [adminNote, setAdminNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    dispatch(fetchWithdrawalRequests({ status: statusFilter }));
  }, [dispatch, statusFilter]);

  const openActionModal = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminNote("");
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedRequest(null);
    setActionType(null);
    setAdminNote("");
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessing(true);
    try {
      if (actionType === "approve") {
        await dispatch(
          approveWithdrawal({ id: selectedRequest.id, admin_note: adminNote })
        ).unwrap();
        toast.success("Withdrawal approved successfully!");
      } else if (actionType === "reject") {
        await dispatch(
          rejectWithdrawal({ id: selectedRequest.id, admin_note: adminNote })
        ).unwrap();
        toast.success("Withdrawal rejected");
      }
      closeActionModal();
      // Refresh the list
      dispatch(fetchWithdrawalRequests({ status: statusFilter }));
    } catch (error) {
      console.error("Failed to process withdrawal:", error);
      toast.error(error || "Failed to process withdrawal request");
    } finally {
      setProcessing(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    try {
      await dispatch(deleteWithdrawal(deleteConfirm.id)).unwrap();
      toast.success("Withdrawal request deleted");
      setDeleteConfirm({ open: false, id: null });
    } catch (error) {
      console.error("Failed to delete withdrawal:", error);
      toast.error(error || "Failed to delete withdrawal request");
      setDeleteConfirm({ open: false, id: null });
    }
  };

  const filteredRequests = items.filter((request) => {
    const matchesSearch =
      request.id?.toString().includes(searchQuery) ||
      request.user_first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user_last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return `${Number(amount)} IQD`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">
          Withdrawal Requests
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by ID, user name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No withdrawal requests
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter !== "all"
                ? `No ${statusFilter} requests found.`
                : "No withdrawal requests have been made yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{request.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.user_first_name} {request.user_last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.user_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {(() => {
                          try {
                            const paymentDetails = typeof request.payment_details === 'string' 
                              ? JSON.parse(request.payment_details) 
                              : request.payment_details;
                            return paymentDetails?.phone || request.user_phone || 'N/A';
                          } catch {
                            return request.user_phone || 'N/A';
                          }
                        })()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(request.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {formatCurrency(request.user_balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                          statusColors[request.status] ||
                          "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      {request.status === "pending" && (
                        <>
                          <Button
                            onClick={() => openActionModal(request, "approve")}
                            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => openActionModal(request, "reject")}
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {request.status !== "approved" && (
                        <Button
                          onClick={() => handleDeleteClick(request.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modal */}
      <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve" : "Reject"} Withdrawal
              Request
            </DialogTitle>
            <DialogClose onClick={closeActionModal} />
          </DialogHeader>

          <DialogBody className="space-y-4">
            {selectedRequest && (
              <>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">User:</span>
                    <span className="text-sm font-medium">
                      {selectedRequest.user_first_name}{" "}
                      {selectedRequest.user_last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(selectedRequest.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Current Balance:
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(selectedRequest.user_balance)}
                    </span>
                  </div>
                  {selectedRequest.user_note && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-gray-600">User Note:</span>
                      <p className="text-sm mt-1">{selectedRequest.user_note}</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="admin_note">
                    Admin Note {actionType === "reject" && "(Required)"}
                  </Label>
                  <Textarea
                    id="admin_note"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder={
                      actionType === "approve"
                        ? "Optional note for approval..."
                        : "Reason for rejection..."
                    }
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {actionType === "approve" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <strong>Note:</strong> Approving this request will deduct{" "}
                      {formatCurrency(selectedRequest.amount)} from the user's
                      wallet.
                    </p>
                  </div>
                )}

                {actionType === "reject" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Rejecting this request will keep
                      the funds in the user's wallet.
                    </p>
                  </div>
                )}
              </>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={closeActionModal}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={
                processing || (actionType === "reject" && !adminNote.trim())
              }
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : actionType === "approve" ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              withdrawal request from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteConfirm({ open: false, id: null })}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Withdrawals;
