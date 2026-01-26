import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchReviews,
  updateReviewStatus,
  deleteReview,
} from "../../store/slices/reviewsSlice";
import {
  Star,
  Trash2,
  Loader2,
  MessageSquare,
  Search,
  Filter,
  Check,
  X,
  Eye,
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

const statusColors = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

const Reviews = () => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.reviews);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  useEffect(() => {
    dispatch(fetchReviews());
  }, [dispatch]);

  const openDetail = (review) => {
    setSelectedReview(review);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedReview(null);
  };

  const handleStatusChange = async (reviewId, newStatus) => {
    await dispatch(updateReviewStatus({ id: reviewId, status: newStatus }));
  };

  const handleApprove = async (id) => {
    await dispatch(updateReviewStatus({ id, status: "approved" }));
  };

  const handleReject = async (id) => {
    await dispatch(updateReviewStatus({ id, status: "rejected" }));
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.id) {
      dispatch(deleteReview(deleteConfirm.id));
    }
    setDeleteConfirm({ open: false, id: null });
  };

  const filteredReviews = items.filter((review) => {
    const matchesSearch =
      review.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.product_title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || review.status === statusFilter;
    const matchesRating =
      ratingFilter === "all" || review.rating === parseInt(ratingFilter);
    return matchesSearch && matchesStatus && matchesRating;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Reviews</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by comment, user, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Star className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No reviews found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Comment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 max-w-37.5 truncate">
                        {review.product_title || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {review.user_name || "Anonymous"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {review.user_email || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4">{renderStars(review.rating)}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 max-w-50 truncate">
                        {review.comment || "No comment"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(review.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          statusColors[review.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {review.status || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => openDetail(review)}
                          className="p-1.5 text-gray-400 hover:text-gray-600"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {review.status !== "approved" && (
                          <Button
                            onClick={() => handleApprove(review.id)}
                            className="p-1.5 text-gray-400 hover:text-green-600"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        {review.status !== "rejected" && (
                          <Button
                            onClick={() => handleReject(review.id)}
                            className="p-1.5 text-gray-400 hover:text-orange-600"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteClick(review.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogClose onClick={closeDetailModal} />
          </DialogHeader>

          <DialogBody className="space-y-5 max-h-[70vh] overflow-y-auto">
            {selectedReview && (
              <>
                {/* Product Info */}
                <div>
                  <Label className="text-gray-500">Product</Label>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedReview.product_title || "N/A"}
                  </p>
                </div>

                {/* User Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Reviewer</Label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedReview.user_name || "Anonymous"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Email</Label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedReview.user_email || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <Label className="text-gray-500">Rating</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(selectedReview.rating)}
                    <span className="text-sm text-gray-600">
                      ({selectedReview.rating}/5)
                    </span>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <Label className="text-gray-500">Comment</Label>
                  <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                    {selectedReview.comment || "No comment provided"}
                  </p>
                </div>

                {/* Date & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Date</Label>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(selectedReview.created_at)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Status</Label>
                    <div className="mt-1">
                      <Select
                        value={selectedReview.status || "pending"}
                        onValueChange={(value) => {
                          handleStatusChange(selectedReview.id, value);
                          setSelectedReview({ ...selectedReview, status: value });
                        }}
                      >
                        <SelectTrigger
                          className={`w-32 h-8 text-xs font-medium ${
                            statusColors[selectedReview.status] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={closeDetailModal}>
              Close
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
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be
              undone.
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

export default Reviews;
